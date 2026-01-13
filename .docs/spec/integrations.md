# 外部連携

## 1. Shotstack連携

### 環境切り替え

**無料動画（サンドボックス）**:
- 透かし入り
- 解像度制限あり
- `SHOTSTACK_API_KEY_SANDBOX`使用

**有料動画（本番）**:
- 透かしなし
- フル解像度
- `SHOTSTACK_API_KEY_PRODUCTION`使用

### 切り替えフロー

```
決済完了 (Webhook: checkout.session.completed)
    ↓
videos取得 (video_type: free)
    ↓
本番キーで再レンダリング実行
- 同一テンプレート構成
- SHOTSTACK_API_KEY_PRODUCTION使用
    ↓
レンダリング完了
- video_url更新（本番動画URL）
- video_type → paid
- サンドボックス動画は削除
```

### 環境変数

```env
SHOTSTACK_API_KEY_SANDBOX=xxx   # 無料動画用
SHOTSTACK_API_KEY_PRODUCTION=xxx # 有料動画用
```

### Edge Function内での切り替え

```typescript
const apiKey = video.video_type === 'paid'
  ? process.env.SHOTSTACK_API_KEY_PRODUCTION
  : process.env.SHOTSTACK_API_KEY_SANDBOX;

const shotstack = new Shotstack(apiKey);
```

### 動画生成フロー（サーバ主導）

```
createVideo Server Action
    ↓
videos作成 (status: pending)
    ↓
Supabase Edge Function (バックグラウンド)
  - Shotstack API呼び出し
  - ポーリング（5秒間隔、最大10分）
  - 完了/失敗 → DB更新
    ↓
クライアントはRealtimeでstatus変更を購読
```

### Realtime購読

```typescript
supabase
  .channel('video-status')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'videos',
    filter: `id=eq.${videoId}`
  }, (payload) => {
    // UI更新
  })
  .subscribe();
```

---

## 2. Stripe連携

### Checkout Session作成

```typescript
async function createCheckoutSession(reservationId: number) {
  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.id, reservationId),
    with: { video: true }
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'jpy',
        product_data: {
          name: 'プロジェクションマッピング投影予約',
        },
        unit_amount: 5000,
      },
      quantity: 1,
    }],
    metadata: {
      reservationId: String(reservationId),
      videoId: String(reservation.video_id),
    },
    success_url: `${process.env.NEXT_PUBLIC_URL}/mypage?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/reservations?cancelled=true`,
  });

  // locked_at更新
  await db.update(reservations)
    .set({ locked_at: new Date() })
    .where(eq(reservations.id, reservationId));

  return { checkoutUrl: session.url };
}
```

### Webhook処理

```typescript
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { reservationId, videoId } = session.metadata;

  await db.transaction(async (tx) => {
    // payment作成
    const [payment] = await tx.insert(payments).values({
      user_id: reservation.user_id,
      amount: 5000,
      stripe_payment_intent_id: session.payment_intent,
      status: 'succeeded'
    }).returning();

    // reservation更新
    await tx.update(reservations)
      .set({
        status: 'confirmed',
        payment_id: payment.id
      })
      .where(eq(reservations.id, Number(reservationId)));

    // video再レンダリングトリガー
    await tx.update(videos)
      .set({
        video_type: 'paid',
        status: 'pending'
      })
      .where(eq(videos.id, Number(videoId)));
  });

  // 本番レンダリング開始
  await triggerProductionRender(Number(videoId));
}
```

---

## 3. タイムゾーン

**全システムJST (Asia/Tokyo) 基準**

### DB設定

- カラム型: `TIMESTAMP WITH TIME ZONE`
- 保存時: UTC
- 表示時: JSTに変換

### アプリケーション設定

```typescript
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Asia/Tokyo';

// 表示用フォーマット
function formatJST(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, 'yyyy/MM/dd HH:mm');
}

// キャンセル期限計算
function canCancel(reservation: Reservation): boolean {
  const projectionStart = getSlotStartTime(
    reservation.projection_date,
    reservation.slot_number
  );
  const deadline = subHours(projectionStart, 48);
  return isBefore(new Date(), deadline);
}
```

### スロット時刻定義

| スロット | 開始時刻 (JST) |
|---------|---------------|
| 1 | 18:15 |
| 2 | 18:45 |
| 3 | 19:15 |
| 4 | 19:45 |

```typescript
const SLOT_START_TIMES: Record<number, string> = {
  1: '18:15',
  2: '18:45',
  3: '19:15',
  4: '19:45',
};

function getSlotStartTime(date: Date, slotNumber: number): Date {
  const timeStr = SLOT_START_TIMES[slotNumber];
  const [hours, minutes] = timeStr.split(':').map(Number);

  return set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
}
```
