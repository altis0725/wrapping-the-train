# DB設計

## テーブル一覧

### users
| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | PK |
| open_id | VARCHAR(64) | LINE userId (UNIQUE) |
| name | TEXT | 表示名 |
| email | VARCHAR(320) | メール (nullable, LINE許可時のみ) |
| login_method | VARCHAR(64) | 認証方式 (default: "line") |
| role | VARCHAR(20) | user/admin |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |
| last_signed_in | TIMESTAMP | 最終ログイン日時 |

### templates
| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | PK |
| category | INTEGER | 1:背景/2:窓/3:車輪 |
| title | VARCHAR(255) | タイトル |
| video_url | VARCHAR(512) | 動画URL |
| thumbnail_url | VARCHAR(512) | サムネイル |
| display_order | INTEGER | 表示順 |
| is_active | INTEGER | 有効フラグ |

### videos
| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | PK |
| user_id | INTEGER | FK→users |
| template1_id | INTEGER | 背景 |
| template2_id | INTEGER | 窓 |
| template3_id | INTEGER | 車輪 |
| video_url | VARCHAR(512) | 生成動画 |
| video_type | VARCHAR(20) | free/paid |
| status | VARCHAR(20) | 処理状態 (pending/processing/completed/failed) |
| render_id | VARCHAR(255) | Shotstack render ID |
| retry_count | INTEGER | 再試行回数 (default: 0, max: 3) |
| last_error | TEXT | 最終エラーメッセージ |
| expires_at | TIMESTAMP | 有効期限 |
| created_at | TIMESTAMP | 作成日時 |

### reservations
| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | PK |
| user_id | INTEGER | FK→users |
| video_id | INTEGER | FK→videos |
| payment_id | INTEGER | FK→payments (nullable) |
| projection_date | DATE | 投影日 |
| slot_number | INTEGER | 1-4 |
| status | VARCHAR(30) | 予約状態 (hold/confirmed/expired/cancelled/completed) |
| hold_expires_at | TIMESTAMP | 仮押さえ期限 |
| locked_at | TIMESTAMP | 決済開始時刻 |
| created_at | TIMESTAMP | 作成日時 |

**制約**:
```sql
-- 同一スロットの二重予約防止（有効な予約のみ対象）
CREATE UNIQUE INDEX reservations_slot_unique
ON reservations(projection_date, slot_number)
WHERE status NOT IN ('expired', 'cancelled');
```

### payments
| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | PK |
| user_id | INTEGER | FK→users |
| amount | INTEGER | 金額 |
| stripe_payment_intent_id | VARCHAR(255) | Stripe ID |
| status | VARCHAR(20) | 決済状態 |

### projection_schedules
| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | PK |
| date | DATE | 投影可能日 (UNIQUE) |
| slots_config | JSONB | 有効スロット |
| is_active | BOOLEAN | 有効フラグ |

### stripe_events
Webhook冪等性確保用

| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | PK |
| event_id | VARCHAR(255) | Stripe Event ID (UNIQUE) |
| event_type | VARCHAR(100) | イベント種別 |
| processed_at | TIMESTAMP | 処理日時 |

**用途**: Stripe Webhookの重複処理を防止。受信済みevent_idは処理をスキップ。

### compensation_logs
補償処理履歴

| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | PK |
| type | VARCHAR(50) | 補償種別 (REFUND/SLOT_REASSIGN/MANUAL) |
| trigger | VARCHAR(100) | トリガー (RENDER_FAILURE/EXPIRED_PAYMENT等) |
| reservation_id | INTEGER | FK→reservations (nullable) |
| payment_id | INTEGER | FK→payments (nullable) |
| video_id | INTEGER | FK→videos (nullable) |
| amount | INTEGER | 返金額 (nullable) |
| resolved_by | VARCHAR(50) | SYSTEM or ADMIN:{id} |
| notes | TEXT | 備考 |
| created_at | TIMESTAMP | 作成日時 |

### state_transition_logs
状態遷移履歴（監査・デバッグ用）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | PK |
| entity | VARCHAR(20) | reservation/payment/video |
| entity_id | INTEGER | 対象エンティティID |
| from_status | VARCHAR(30) | 遷移前状態 |
| to_status | VARCHAR(30) | 遷移後状態 |
| trigger | VARCHAR(50) | webhook/cron/user/admin |
| success | BOOLEAN | 成功フラグ |
| conflict_detected | BOOLEAN | 競合検出フラグ |
| metadata | JSONB | 追加情報 |
| created_at | TIMESTAMP | 作成日時 |

---

## 追加カラム

### reservations テーブル追加カラム

| カラム | 型 | 説明 |
|--------|-----|------|
| idempotency_key | VARCHAR(64) | 冪等性キー (UNIQUE) |
| cancelled_at | TIMESTAMP | キャンセル日時 (nullable) |
| updated_at | TIMESTAMP | 最終更新日時 |

```sql
ALTER TABLE reservations
ADD COLUMN idempotency_key VARCHAR(64) UNIQUE,
ADD COLUMN cancelled_at TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX reservations_idempotency_key_idx ON reservations(idempotency_key);
CREATE INDEX reservations_updated_at_idx ON reservations(updated_at);
```

### payments テーブル追加カラム

| カラム | 型 | 説明 |
|--------|-----|------|
| refund_id | VARCHAR(255) | Stripe Refund ID (nullable) |
| refunded_at | TIMESTAMP | 返金日時 (nullable) |
| updated_at | TIMESTAMP | 最終更新日時 |

```sql
ALTER TABLE payments
ADD COLUMN refund_id VARCHAR(255),
ADD COLUMN refunded_at TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
```

---

## インデックス設計

### パフォーマンス最適化

```sql
-- 予約検索（日付・スロット）
CREATE INDEX reservations_date_slot_idx
ON reservations(projection_date, slot_number);

-- 動画検索（ユーザー・ステータス）
CREATE INDEX videos_user_status_idx
ON videos(user_id, status);

-- 期限切れ処理用
CREATE INDEX reservations_hold_expires_idx
ON reservations(hold_expires_at)
WHERE status = 'hold';

-- 動画クリーンアップ用
CREATE INDEX videos_expires_idx
ON videos(expires_at)
WHERE expires_at IS NOT NULL;

-- 補償処理検索用
CREATE INDEX compensation_logs_reservation_idx
ON compensation_logs(reservation_id);
```
