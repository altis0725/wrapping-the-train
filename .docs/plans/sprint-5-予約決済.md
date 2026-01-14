# Sprint 5: 予約・決済（整合性担保）

**状態**: ✅ 完了
**目標**: Cron/Webhook 含む完全な予約フロー

---

## 状態遷移設計

### Reservation
```
hold (15分TTL) → confirmed (決済完了)
              → expired (TTL切れ/Cron)
              → cancelled (ユーザー/管理者)
```

### Payment
```
pending → succeeded → refunded
       → failed
```

---

## タスク一覧

### 5.1 shadcn/ui コンポーネント追加
- [x] Calendar コンポーネント
- [x] Badge コンポーネント
- [x] Alert コンポーネント

### 5.2 予約UI (/reservations)
- [x] カレンダー表示 (投影可能日のみ選択可)
- [x] 時間スロット選択 (1日4枠: 18:15/18:45/19:15/19:45)
- [x] スロット状態表示 (available/hold/reserved)
- [x] カウントダウンタイマー (仮押さえ15分)
- [x] 期限切れ時のUI遷移 (コールバック通知)

### 5.3 予約API (src/actions/reservation.ts)
- [x] getAvailableSlots(date): スロット状態取得
- [x] holdSlot(videoId, date, slotNumber): 仮押さえ
  - DB制約で二重予約防止
  - hold_expires_at = NOW() + 15分
- [x] releaseSlot(reservationId): 仮押さえ解放
- [x] cancelReservation(reservationId): キャンセル処理
- [x] 排他制御
  - ユニーク制約による二重予約防止
  - 冪等性キー対応

### 5.4 Stripe決済
- [x] Checkout Session作成 (src/actions/payment.ts)
  - createCheckoutSession(reservationId)
  - metadata に reservationId/videoId/userId 含める
  - 15分の有効期限設定
- [x] Stripe Webhook (/api/webhooks/stripe)
  - 署名検証 (stripe.webhooks.constructEvent)
  - checkout.session.completed 処理
  - 冪等性保証 (stripe_events テーブル)

### 5.5 予約確定処理
- [x] reservation.status: hold → confirmed
- [x] 動画アップグレード
  - video.video_type: free → paid
  - video.expires_at: 投影日 + 1年

### 5.6 Cron: 仮押さえ自動解放
- [x] /api/cron/release-holds
  - CRON_SECRET 認証
  - hold_expires_at < NOW() の予約を expired に
- [x] GET/POST 両対応

### 5.7 補償処理
- [x] 決済成功 + DB失敗時の補償ログ記録
  - compensation_logs に記録
- [x] Webhook リトライ対応
  - 重複イベント検知 (stripe_events テーブル)

### 5.8 認可・セキュリティ (DoD)
- [x] 予約の所有者チェック (IDOR対策)
- [x] Webhook 署名検証必須
- [x] 入力バリデーション (Zod)

### 5.9 最小管理機能
- [ ] 予約強制キャンセルAPI (Admin用) ※Sprint 6で実装

---

## 完了条件 (Definition of Done)

- [x] 仮押さえ → 決済 → 確定 の一連フローが動作する
- [x] 15分経過で仮押さえが自動解放される（Cron）
- [x] Stripe Webhook が冪等に処理される
- [x] 決済失敗時に補償ログが記録される
- [x] 他ユーザーの予約にアクセスできない

---

## 作成ファイル一覧

| ファイル | 内容 |
|---------|------|
| src/components/ui/calendar.tsx | Calendar コンポーネント |
| src/components/ui/badge.tsx | Badge コンポーネント |
| src/components/ui/alert.tsx | Alert コンポーネント |
| src/lib/constants/slot.ts | スロット関連定数 |
| src/lib/validations/reservation.ts | 予約バリデーション |
| src/lib/stripe.ts | Stripe クライアント |
| src/actions/reservation.ts | 予約API |
| src/actions/payment.ts | 決済API |
| src/app/api/webhooks/stripe/route.ts | Stripe Webhook |
| src/app/api/cron/release-holds/route.ts | 仮押さえ自動解放Cron |
| src/components/reservations/slot-selector.tsx | スロット選択UI |
| src/components/reservations/countdown-timer.tsx | カウントダウンタイマー |
| src/components/reservations/reservation-form.tsx | 予約フォーム |
| src/app/(public)/reservations/page.tsx | 予約ページ |

---

## 参照仕様
- [画面仕様 - Reservations](.docs/spec/screens.md#reservations-reservations)
- [ビジネスロジック - 予約・決済フロー](.docs/spec/business-logic.md#予約決済フロー仮押さえ方式)
- [API仕様 - 予約](.docs/spec/api.md#予約)
- [エラーハンドリング](.docs/spec/error-handling.md)
