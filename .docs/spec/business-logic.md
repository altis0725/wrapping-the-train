# ビジネスロジック

## 動画生成フロー（サーバ主導）

```
テンプレート選択 (背景/窓/車輪)
    ↓
videos.create (status: pending)
- 無料: expires_at = 7日後
    ↓
Supabase Edge Function (バックグラウンド)
- status → processing
- Shotstack ルママスク合成
  - Track1: 車輪 + mask_wheel.png
  - Track2: 窓 + mask_window.png
  - Track3: 背景
- ポーリング（5秒間隔、最大10分）
    ↓
完了 → status: completed, video_url設定
失敗 → retry_count++, 最大3回再試行
    ↓
クライアントはSupabase Realtimeでstatus変更を購読
```

**クライアント購読**:
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

## 予約・決済フロー（仮押さえ方式）

```
「投影を予約する」クリック
    ↓
スロット選択
    ↓
仮押さえ (status: hold, hold_expires_at: 15分後)
- DB制約で二重予約を防止
    ↓
Stripe Checkout Session作成
- locked_at に現在時刻を記録
    ↓
Stripe決済ページ
    ↓
[15分以内に決済完了?]
  - Yes → Webhook: checkout.session.completed
    - payment: succeeded
    - reservation.status → confirmed
    - video再レンダリング (Production)
    - video.video_type → paid
    - video.expires_at → 投影日 + 1年
    → /mypage へリダイレクト
  - No → cron/Edge Functionで自動解放
    - reservation.status → expired
    - スロット再開放
```

## 予約ルール

- **投影可能日**: projection_schedulesに登録された日のみ
- **スロット**: 1日4枠 (18:15/18:45/19:15/19:45開始)
- **初期設定**: 2025/1/31のみ
- **変更/キャンセル**: 投影開始48時間前まで（JST基準）
- **タイムゾーン**: 全システムJST (Asia/Tokyo) 基準

**キャンセル期限判定**:
```typescript
const CANCEL_DEADLINE_HOURS = 48;
const TIMEZONE = 'Asia/Tokyo';

function canCancel(reservation: Reservation): boolean {
  const projectionStart = getSlotStartTime(
    reservation.projection_date,
    reservation.slot_number
  );
  const deadline = subHours(projectionStart, CANCEL_DEADLINE_HOURS);
  return isBefore(new Date(), deadline);
}
```

## 動画有効期限

| プラン | 保持期間 |
|--------|---------|
| 無料 | 7日間 |
| 有料 | 投影後1年間 |

- 無料動画: cronまたはEdge Functionで自動削除
- 有料動画: 投影日から1年後に自動削除対象

## 動画削除可能条件

動画を削除できるのは以下の条件を全て満たす場合のみ:

1. **予約紐付けなし**: confirmed/completed状態の予約に紐付いていない
2. **仮押さえなし**: hold状態の予約に紐付いていない
3. **所有者**: 自分が作成した動画である

```typescript
async function canDeleteVideo(videoId: number): Promise<{
  canDelete: boolean;
  reason?: string;
}> {
  const activeReservation = await db.query.reservations.findFirst({
    where: and(
      eq(reservations.video_id, videoId),
      inArray(reservations.status, ['hold', 'confirmed', 'completed'])
    )
  });

  if (activeReservation) {
    return {
      canDelete: false,
      reason: '有効な予約に紐付いているため削除できません'
    };
  }

  return { canDelete: true };
}
```

## 失敗時補償

### 動画生成失敗時
1. 自動で再レンダリング（最大3回）
2. 3回失敗 → 管理者通知 + ユーザーへメール
3. 決済済みの場合、24時間以内に解決しない → 自動返金

### 返金処理
- Stripe Refund API使用
- `payments.status` = 'refunded'
- `reservations.status` = 'cancelled'
- `video.video_type` = 'free' に戻す
- `video.expires_at` = 7日後に再設定
