# API仕様

## Server Actions

### テンプレート
```typescript
getTemplatesByCategory(category: 1|2|3): Promise<Template[]>
getAllTemplates(): Promise<Template[]>  // Admin
createTemplate(data): Promise<{id: number}>  // Admin
updateTemplate(id, data): Promise<void>  // Admin
deleteTemplate(id): Promise<void>  // Admin
```

### 動画
```typescript
// 動画生成（Edge Functionをトリガー）
createVideo(data: {
  template1Id: number
  template2Id: number
  template3Id: number
}): Promise<{videoId: number}>

// ユーザーの動画一覧
getUserVideos(): Promise<Video[]>

// 動画削除可否チェック
canDeleteVideo(videoId: number): Promise<{
  canDelete: boolean
  reason?: string
}>

// 動画削除（条件を満たす場合のみ）
deleteVideo(videoId: number): Promise<void>
```

### 予約
```typescript
// スロット仮押さえ（15分間有効）
holdSlot(data: {
  videoId: number
  projectionDate: Date
  slotNumber: number
}): Promise<{
  reservationId: number
  expiresAt: Date
}>

// 仮押さえ解放（ユーザー手動キャンセル）
releaseSlot(reservationId: number): Promise<void>

// 利用可能スロット取得
getAvailableSlots(date: Date): Promise<{
  slotNumber: number
  status: 'available' | 'hold' | 'reserved'
}[]>

// ユーザーの予約一覧
getUserReservations(): Promise<Reservation[]>

// 予約変更（48時間前まで）
updateReservation(id: number, data: {
  projectionDate: Date
  slotNumber: number
}): Promise<void>

// 予約キャンセル（48時間前まで）
cancelReservation(id: number): Promise<void>

// 投影完了マーク（Admin）
markProjectionCompleted(id: number): Promise<void>
```

### 決済
```typescript
// Checkout Session作成（仮押さえ必須）
createCheckoutSession(reservationId: number): Promise<{
  checkoutUrl: string
}>

// ユーザーの決済履歴
getUserPayments(): Promise<Payment[]>
```

## Route Handlers

### Webhooks
| パス | 説明 |
|-----|------|
| `/api/webhooks/stripe` | Stripe Webhook（冪等性保証） |

**Stripe Webhook処理フロー**:
1. Stripe署名検証
2. `stripe_events`テーブルでevent_id重複チェック
3. 重複あり → 200返却（スキップ）
4. 重複なし → 処理実行 → event_id記録

### 動画関連
| パス | 説明 |
|-----|------|
| `/api/video/callback` | Edge Functionからの完了通知 |

### 投影配信（Phase 2）
現地投影用APIは Phase 2 で実装予定。

詳細: [phase2/projection-delivery.md](./phase2/projection-delivery.md)

## Supabase Edge Functions

### video-render
動画レンダリングをバックグラウンドで実行。

```typescript
// トリガー: videos INSERT (status: pending)
// 処理:
// 1. status → processing
// 2. Shotstack API呼び出し
// 3. ポーリング（5秒間隔、最大10分）
// 4. 完了/失敗 → DB更新
// 5. 失敗時 → retry_count++, 最大3回再試行
```

### reservation-cleanup
期限切れ仮押さえの自動解放。

```typescript
// トリガー: cron (毎分)
// 処理:
// 1. hold_expires_at < NOW() の予約を取得
// 2. status → expired に更新
```

### video-cleanup
期限切れ動画の自動削除。

```typescript
// トリガー: cron (毎日 3:00 JST)
// 処理:
// 1. expires_at < NOW() の動画を取得
// 2. Supabase Storageから動画ファイル削除
// 3. DBレコード削除
```
