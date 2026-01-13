# DB設計

## テーブル一覧

### users
| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | PK |
| supabase_uid | VARCHAR(64) | Auth UID |
| name | TEXT | 表示名 |
| email | VARCHAR(320) | メール |
| role | VARCHAR(20) | user/admin |
| created_at | TIMESTAMP | 作成日時 |

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
| status | VARCHAR(20) | 処理状態 |
| expires_at | TIMESTAMP | 有効期限 |

### reservations
| カラム | 型 | 説明 |
|--------|-----|------|
| id | SERIAL | PK |
| user_id | INTEGER | FK→users |
| video_id | INTEGER | FK→videos |
| payment_id | INTEGER | FK→payments |
| projection_date | DATE | 投影日 |
| slot_number | INTEGER | 1-4 |
| status | VARCHAR(30) | 予約状態 |

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
