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
createVideo(data: {
  template1Id: number
  template2Id: number
  template3Id: number
  isPaid: boolean
}): Promise<{videoId: number}>

getUserVideos(): Promise<Video[]>
deleteVideo(id): Promise<void>
```

### 予約
```typescript
createReservation(data: {
  videoId: number
  projectionDate: Date
  slotNumber: number
}): Promise<{reservationId: number}>

getUserReservations(): Promise<Reservation[]>
getAvailableSlots(date: Date): Promise<number[]>
updateReservation(id, data): Promise<void>  // 2日前まで
cancelReservation(id): Promise<void>  // 2日前まで
```

### 決済
```typescript
createCheckoutSession(videoId: number): Promise<{checkoutUrl: string}>
getUserPayments(): Promise<Payment[]>
```

## Route Handlers

| パス | 説明 |
|-----|------|
| `/api/webhooks/stripe` | Stripe Webhook |
| `/api/video/status/[renderId]` | Shotstack状態確認 |
