# 状態遷移表

各エンティティの状態遷移を定義する。

## videos.status

| 状態 | 遷移先 | トリガー | 責任主体 |
|------|--------|---------|---------|
| pending | processing | createVideo実行 | Edge Function |
| processing | completed | Shotstackレンダリング完了 | Edge Function |
| processing | failed | レンダリング失敗/タイムアウト | Edge Function |
| failed | processing | 再試行（最大3回） | Edge Function |

```
pending → processing → completed
              ↓
           failed ←→ processing (retry)
```

## reservations.status

| 状態 | 遷移先 | トリガー | 責任主体 |
|------|--------|---------|---------|
| hold | confirmed | 決済成功Webhook | Stripe Webhook |
| hold | expired | 15分経過 | cron/Edge Function |
| confirmed | cancelled | ユーザーキャンセル（48時間前まで） | ユーザー |
| confirmed | completed | 投影完了 | 管理者 |

```
hold → confirmed → completed
  ↓        ↓
expired  cancelled
```

## payments.status

| 状態 | 遷移先 | トリガー | 責任主体 |
|------|--------|---------|---------|
| pending | succeeded | Webhook: payment_intent.succeeded | Stripe Webhook |
| pending | failed | Webhook: payment_intent.failed | Stripe Webhook |
| succeeded | refunded | キャンセル返金処理 | システム/管理者 |

```
pending → succeeded → refunded
    ↓
  failed
```

## 状態遷移の原則

1. **不可逆性**: 一度`completed`や`refunded`になった状態は変更不可
2. **タイムアウト**: `hold`状態は15分でタイムアウト
3. **整合性**: `reservations.status`と`payments.status`は常に整合を保つ
   - `confirmed` ↔ `succeeded`
   - `cancelled` ↔ `refunded`

---

## 競合発生時の状態遷移

詳細は [race-conditions.md](./race-conditions.md) を参照。

### reservations.status 競合解決

| 競合シナリオ | 現在の状態 | 到着イベント | 解決後の状態 | 補償処理 |
|-------------|-----------|-------------|-------------|---------|
| 期限切れ後の決済到着 | expired | 決済成功Webhook | expired（維持） | 自動返金 |
| 決済中の期限切れ | hold | cron期限切れ処理 | expired | 決済成功時は返金 |
| 同時キャンセル要求 | confirmed | キャンセル×2 | cancelled | 2回目は冪等成功 |
| キャンセル後の決済 | cancelled | 決済成功Webhook | cancelled（維持） | 自動返金 |

### 競合解決の優先順位

```
時間ベースの期限切れ > ユーザーの明示的操作 > システム自動処理
```

1. **expired**: 時間切れは確定事実として最優先
2. **cancelled**: ユーザーの意思表示を尊重
3. **confirmed**: 決済成功は可能な限りサービス提供
4. **hold**: 仮押さえは最も弱い状態

### 遷移の排他制御

```typescript
// 楽観的ロックパターン
async function transitionState(
  reservationId: number,
  expectedStatus: ReservationStatus,
  newStatus: ReservationStatus
): Promise<boolean> {
  const result = await db.update(reservations)
    .set({ status: newStatus, updated_at: new Date() })
    .where(and(
      eq(reservations.id, reservationId),
      eq(reservations.status, expectedStatus)  // 期待する現在状態
    ))
    .returning();

  return result.length > 0;  // false = 競合発生
}
```

### 状態遷移ログ

全ての状態遷移を記録し、競合検出とデバッグに使用。

```typescript
interface StateTransitionLog {
  entity: 'reservation' | 'payment' | 'video';
  entity_id: number;
  from_status: string;
  to_status: string;
  trigger: string;  // 'webhook' | 'cron' | 'user_action' | 'admin_action'
  success: boolean;
  conflict_detected: boolean;
  timestamp: Date;
}
