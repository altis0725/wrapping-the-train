# エラーハンドリング・補償処理

## 1. Webhook冪等性

### stripe_eventsテーブル

Stripe Webhookの重複処理を防止するためのイベント記録テーブル。

```sql
CREATE TABLE stripe_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW()
);
```

### 処理フロー

```
Webhook受信
    ↓
stripe_eventsにevent_id存在チェック
    ↓
[存在する?]
  - Yes → 200返却（重複スキップ）
  - No  → 処理実行 → event_id記録 → 200返却
```

### 実装例

```typescript
async function handleStripeWebhook(event: Stripe.Event) {
  // 1. 重複チェック
  const existing = await db.query.stripeEvents.findFirst({
    where: eq(stripeEvents.event_id, event.id)
  });

  if (existing) {
    console.log(`Skipping duplicate event: ${event.id}`);
    return { status: 200 };
  }

  // 2. 処理実行
  try {
    await processEvent(event);

    // 3. イベント記録
    await db.insert(stripeEvents).values({
      event_id: event.id,
      event_type: event.type
    });

    return { status: 200 };
  } catch (error) {
    // エラー時は記録しない（再送時に再処理される）
    throw error;
  }
}
```

---

## 2. 失敗時補償

### 動画生成失敗時

```
レンダリング失敗
    ↓
retry_count++
    ↓
[retry_count < 3?]
  - Yes → 再レンダリング実行
  - No  → 管理者通知 + ユーザーへメール
            ↓
         [24時間以内に解決?]
           - Yes → 手動対応
           - No  → 自動返金
```

**リトライ管理**:
```typescript
async function handleRenderFailure(videoId: number, error: string) {
  const video = await db.query.videos.findFirst({
    where: eq(videos.id, videoId)
  });

  if (video.retry_count < 3) {
    // リトライ
    await db.update(videos)
      .set({
        retry_count: video.retry_count + 1,
        last_error: error,
        status: 'processing'
      })
      .where(eq(videos.id, videoId));

    await triggerRender(videoId);
  } else {
    // 最大リトライ超過
    await db.update(videos)
      .set({
        status: 'failed',
        last_error: error
      })
      .where(eq(videos.id, videoId));

    await notifyAdmin(videoId, error);
    await notifyUser(video.user_id, videoId);
  }
}
```

### 返金処理

```typescript
async function processRefund(paymentId: number) {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.id, paymentId)
  });

  // Stripe返金
  await stripe.refunds.create({
    payment_intent: payment.stripe_payment_intent_id
  });

  // DB更新
  await db.transaction(async (tx) => {
    // payments更新
    await tx.update(payments)
      .set({ status: 'refunded' })
      .where(eq(payments.id, paymentId));

    // reservations更新
    await tx.update(reservations)
      .set({ status: 'cancelled' })
      .where(eq(reservations.payment_id, paymentId));

    // videos更新（有料→無料に戻す）
    const reservation = await tx.query.reservations.findFirst({
      where: eq(reservations.payment_id, paymentId)
    });

    if (reservation) {
      await tx.update(videos)
        .set({
          video_type: 'free',
          expires_at: addDays(new Date(), 7)
        })
        .where(eq(videos.id, reservation.video_id));
    }
  });
}
```

---

## 3. 仮押さえ期限切れ処理

### クリーンアップジョブ

```typescript
// cron: 毎分実行
async function cleanupExpiredHolds() {
  const expiredReservations = await db.query.reservations.findMany({
    where: and(
      eq(reservations.status, 'hold'),
      lt(reservations.hold_expires_at, new Date())
    )
  });

  for (const reservation of expiredReservations) {
    await db.update(reservations)
      .set({ status: 'expired' })
      .where(eq(reservations.id, reservation.id));

    console.log(`Expired reservation: ${reservation.id}`);
  }
}
```

---

## 4. エラー通知

### 管理者通知

```typescript
async function notifyAdmin(videoId: number, error: string) {
  // Slack/Discord/メール等で通知
  await sendAdminNotification({
    type: 'VIDEO_RENDER_FAILURE',
    videoId,
    error,
    timestamp: new Date()
  });
}
```

### ユーザー通知

```typescript
async function notifyUser(userId: number, videoId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  await sendEmail({
    to: user.email,
    template: 'video-render-failure',
    data: { videoId }
  });
}
```

---

## 5. 補償処理SLA

### 定義

| 障害種別 | 検知から対応開始 | 解決までの目標 | 未解決時の自動処理 |
|---------|-----------------|---------------|-------------------|
| レンダリング失敗 | 即時（自動） | 24時間 | 自動返金 |
| 決済Webhook遅延 | 即時（自動） | - | 状態に応じた補償 |
| 仮押さえ期限切れ後決済 | 即時（自動） | - | 自動返金 |
| システム障害による予約不可 | 5分以内 | 1時間 | 管理者エスカレーション |

### 自動返金のトリガー条件

```typescript
const AUTO_REFUND_TRIGGERS = {
  // レンダリング失敗後24時間経過
  RENDER_FAILURE_TIMEOUT: {
    condition: 'video.status === "failed" && video.video_type === "paid"',
    timeout_hours: 24,
    action: 'AUTO_REFUND'
  },
  // 期限切れ後の決済到着
  EXPIRED_AFTER_PAYMENT: {
    condition: 'reservation.status === "expired" && payment.status === "succeeded"',
    timeout_hours: 0,  // 即時
    action: 'AUTO_REFUND'
  }
};
```

### エスカレーション規則

| レベル | 条件 | 通知先 | 応答期限 |
|-------|------|--------|---------|
| L1 | レンダリング失敗（初回） | Slack #alerts | - |
| L2 | レンダリング失敗（3回目） | Slack #alerts + メール | 4時間 |
| L3 | 24時間未解決 | 電話 + 自動返金 | 即時 |

### 補償履歴の記録

```sql
CREATE TABLE compensation_logs (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,  -- 'REFUND', 'SLOT_REASSIGN', 'MANUAL_RESOLUTION'
  trigger VARCHAR(100) NOT NULL,  -- 'RENDER_FAILURE', 'EXPIRED_PAYMENT', etc.
  reservation_id INTEGER REFERENCES reservations(id),
  payment_id INTEGER REFERENCES payments(id),
  video_id INTEGER REFERENCES videos(id),
  amount INTEGER,  -- 返金額（該当する場合）
  resolved_by VARCHAR(50),  -- 'SYSTEM' | 'ADMIN:{admin_id}'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### ユーザー向け補償ポリシー（公開用）

> **返金ポリシー**
> - 投影予定日の48時間前までキャンセル・返金可能です
> - システム障害により動画生成ができなかった場合、全額返金いたします
> - 返金処理には3〜5営業日かかる場合があります

---

## 6. 障害発生時のユーザー導線

### 決済失敗時

```
決済ページでエラー発生
    ↓
エラーメッセージ表示:
「決済処理中にエラーが発生しました。再度お試しください。」
    ↓
「再試行」ボタン → 新しいCheckout Session作成
    ↓
[3回連続失敗?]
  - Yes → 「お問い合わせください」+ サポートリンク
  - No  → 再試行継続
```

### レンダリング失敗時（有料）

```
マイページで動画ステータス「生成失敗」表示
    ↓
メッセージ:
「動画の生成に問題が発生しました。
 24時間以内に解決しない場合、自動的に返金されます。
 お急ぎの場合はお問い合わせください。」
    ↓
「お問い合わせ」ボタン → 問い合わせフォーム（video_id自動入力）
```
