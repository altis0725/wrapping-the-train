# ビジネスロジック

## 動画生成フロー

```
テンプレート選択 (背景/窓/車輪)
    ↓
videos.create (status: processing)
- 無料: expires_at = 7日後
    ↓
Shotstack ルママスク合成
- Track1: 車輪 + mask_wheel.png
- Track2: 窓 + mask_window.png
- Track3: 背景
    ↓
ポーリング (5秒間隔、最大10分)
    ↓
完了 → status: completed
```

## 決済フロー

```
「投影を予約する」クリック
    ↓
Stripe Checkout Session作成
    ↓
Stripe決済ページ
    ↓
Webhook: checkout.session.completed
- payment: succeeded
- video再レンダリング (Production)
- videoType: paid, expires_at: null
    ↓
/reservations へリダイレクト
```

## 予約ルール

- **投影可能日**: projection_schedulesに登録された日のみ
- **スロット**: 1日4枠 (18:15/18:45/19:15/19:45開始)
- **初期設定**: 2025/1/31のみ
- **変更/キャンセル**: 投影2日前まで

## 動画有効期限

- 無料: 7日後に自動削除 (cron/Edge Function)
- 有料: 永続保存
