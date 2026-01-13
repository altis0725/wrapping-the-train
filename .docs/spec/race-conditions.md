# 競合処理・補償処理

予約・決済・動画生成の3系統が非同期で動作するため、競合状態が発生し得る。本ドキュメントでは競合シナリオと解決規則を定義する。

## 設計原則

1. **決済優先**: 決済が成功した場合、可能な限りサービスを提供する
2. **透明性**: 競合発生時はユーザーに明確に通知する
3. **自動補償**: 人手を介さず自動で補償処理を実行する
4. **冪等性**: 同一リクエストの重複実行は同一結果を返す

---

## 競合シナリオ一覧

### シナリオ1: 期限切れ後の決済Webhook到着

**発生条件**:
- ユーザーが仮押さえ後、決済ページで操作に時間がかかる
- 15分の仮押さえ期限が切れ、`status: expired` に変更
- その直後に決済が完了し、Webhookが到着

**タイムライン例**:
```
00:00 - 仮押さえ作成 (status: hold, hold_expires_at: 00:15)
00:14 - ユーザーが決済ボタンをクリック
00:15 - cronジョブで期限切れ処理 (status: expired)
00:16 - Stripe決済成功 → Webhook到着
```

**解決規則**:
```typescript
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { reservationId } = session.metadata;

  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.id, Number(reservationId))
  });

  // 期限切れチェック
  if (reservation.status === 'expired') {
    // 自動返金を実行
    await stripe.refunds.create({
      payment_intent: session.payment_intent as string,
      reason: 'requested_by_customer'
    });

    // ユーザー通知
    await sendEmail({
      to: reservation.user.email,
      template: 'reservation-expired-refunded',
      data: {
        reservationId,
        refundAmount: session.amount_total
      }
    });

    // 管理者ログ
    await logEvent('EXPIRED_RESERVATION_REFUNDED', { reservationId });

    return;
  }

  // 通常の決済完了処理
  await confirmReservation(reservationId, session);
}
```

**ユーザー通知**:
> 予約の仮押さえ期限が切れたため、お支払いは自動的に返金されました。
> 再度スロットを選択し、予約をお試しください。

---

### シナリオ2: 決済処理中のスロット競合

**発生条件**:
- ユーザーAとユーザーBが同時に同一スロットを仮押さえ
- DB制約により一方は失敗するが、タイミングにより両方が決済ページに進む可能性

**防止策（データベースレベル）**:
```sql
-- 部分ユニークインデックス（既存）
CREATE UNIQUE INDEX reservations_slot_unique
ON reservations(projection_date, slot_number)
WHERE status NOT IN ('expired', 'cancelled');
```

**アプリケーションレベル対策**:
```typescript
async function holdSlot(data: HoldSlotInput): Promise<HoldSlotResult> {
  const { videoId, projectionDate, slotNumber, idempotencyKey } = data;

  // 冪等性チェック
  const existingHold = await db.query.reservations.findFirst({
    where: eq(reservations.idempotency_key, idempotencyKey)
  });
  if (existingHold) {
    return { reservationId: existingHold.id, expiresAt: existingHold.hold_expires_at };
  }

  try {
    const [reservation] = await db.insert(reservations).values({
      user_id: currentUser.id,
      video_id: videoId,
      projection_date: projectionDate,
      slot_number: slotNumber,
      status: 'hold',
      hold_expires_at: addMinutes(new Date(), 15),
      idempotency_key: idempotencyKey
    }).returning();

    return { reservationId: reservation.id, expiresAt: reservation.hold_expires_at };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('SLOT_ALREADY_TAKEN', 'このスロットは既に予約されています');
    }
    throw error;
  }
}
```

---

### シナリオ3: 決済成功後の動画再レンダリング失敗

**発生条件**:
- 決済完了後、本番品質での再レンダリングを実行
- Shotstack APIエラー/タイムアウトで3回失敗

**解決規則**:

| 条件 | 対応 |
|------|------|
| 24時間以内に手動解決 | 管理者が手動で対応、ユーザーに連絡 |
| 24時間経過 | 自動返金 + 予約キャンセル |

```typescript
// cron: 毎時実行
async function checkFailedRenders() {
  const failedVideos = await db.query.videos.findMany({
    where: and(
      eq(videos.status, 'failed'),
      eq(videos.video_type, 'paid'),
      lt(videos.updated_at, subHours(new Date(), 24))
    ),
    with: { reservation: { with: { payment: true } } }
  });

  for (const video of failedVideos) {
    if (!video.reservation?.payment) continue;

    // 自動返金
    await processRefund(video.reservation.payment.id);

    // ユーザー通知
    await sendEmail({
      to: video.user.email,
      template: 'render-failed-refunded',
      data: {
        videoId: video.id,
        refundAmount: video.reservation.payment.amount
      }
    });

    await logEvent('RENDER_FAILED_AUTO_REFUND', { videoId: video.id });
  }
}
```

---

### シナリオ4: Webhook重複到着

**発生条件**:
- ネットワーク遅延によりStripeがWebhookを再送
- 同一イベントが複数回処理される

**解決策**: 既存の `stripe_events` テーブルによる冪等性保証（error-handling.md参照）

---

### シナリオ5: 同時キャンセル要求

**発生条件**:
- ユーザーがマイページで「キャンセル」をダブルクリック
- 2つの返金処理が同時に走る

**解決策**:

```typescript
async function cancelReservation(reservationId: number): Promise<void> {
  // 楽観的ロック
  const result = await db.update(reservations)
    .set({
      status: 'cancelled',
      cancelled_at: new Date()
    })
    .where(and(
      eq(reservations.id, reservationId),
      eq(reservations.status, 'confirmed')  // 状態チェック
    ))
    .returning();

  if (result.length === 0) {
    // 既にキャンセル済み or 状態変更済み
    const current = await db.query.reservations.findFirst({
      where: eq(reservations.id, reservationId)
    });

    if (current?.status === 'cancelled') {
      return; // 冪等に成功を返す
    }

    throw new AppError('CANNOT_CANCEL', '予約をキャンセルできません');
  }

  // 返金処理（冪等性はStripe側で保証）
  await processRefund(result[0].payment_id);
}
```

---

## 冪等性トークン

### 設計

クライアントがリクエスト毎にUUIDを生成し、サーバーに送信。同一UUIDのリクエストは同一結果を返す。

```typescript
// クライアント側
const idempotencyKey = crypto.randomUUID();
await holdSlot({ videoId, projectionDate, slotNumber, idempotencyKey });

// サーバー側
interface HoldSlotInput {
  videoId: number;
  projectionDate: Date;
  slotNumber: number;
  idempotencyKey: string;  // UUID v4
}
```

### データベース

```sql
ALTER TABLE reservations
ADD COLUMN idempotency_key VARCHAR(64) UNIQUE;

CREATE INDEX reservations_idempotency_key_idx
ON reservations(idempotency_key);
```

---

## 分散ロック（将来のスケーリング用）

現時点では単一DBインスタンスのため不要だが、将来のスケールアウト時に備えた設計。

### アドバイザリーロック方式

```typescript
const LOCK_TIMEOUT_MS = 5000;

async function withSlotLock<T>(
  date: Date,
  slotNumber: number,
  fn: () => Promise<T>
): Promise<T> {
  const lockKey = `slot:${date.toISOString().split('T')[0]}:${slotNumber}`;
  const lockId = hashToInt(lockKey);

  // PostgreSQLアドバイザリーロック取得
  await db.execute(sql`SELECT pg_advisory_lock(${lockId})`);

  try {
    return await fn();
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
  }
}

// 使用例
await withSlotLock(projectionDate, slotNumber, async () => {
  await holdSlot({ videoId, projectionDate, slotNumber, idempotencyKey });
});
```

---

## 状態遷移の競合解決優先順位

| 競合 | 優先される状態 | 理由 |
|------|---------------|------|
| hold vs expired | expired | 時間切れは確定事実 |
| expired vs confirmed | expired（返金） | 期限は厳守 |
| confirmed vs cancelled | cancelled | ユーザー意思を尊重 |
| processing vs failed | 再試行可能ならprocessing | サービス提供を優先 |

---

## 監視・アラート

### 競合発生時のログ形式

```typescript
interface RaceConditionLog {
  event: 'RACE_CONDITION_DETECTED';
  scenario: 'EXPIRED_AFTER_PAYMENT' | 'SLOT_CONFLICT' | 'RENDER_FAILURE' | 'DUPLICATE_CANCEL';
  reservationId?: number;
  videoId?: number;
  resolution: 'REFUNDED' | 'RETRY' | 'MANUAL_REQUIRED';
  timestamp: Date;
}
```

### アラート条件

| 条件 | アラートレベル |
|------|---------------|
| 1時間に期限切れ返金が5件以上 | Warning |
| 24時間以内にレンダリング失敗返金 | Critical |
| 手動対応が必要なケース | Critical |
