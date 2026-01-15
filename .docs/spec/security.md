# セキュリティ・認証

## 1. RLS (Row Level Security)

### videos
```sql
-- ユーザーは自分の動画のみ閲覧可能
CREATE POLICY videos_select ON videos
  FOR SELECT USING (auth.uid() = user_id);

-- 削除は条件付き（can_delete_video関数で判定）
CREATE POLICY videos_delete ON videos
  FOR DELETE USING (
    auth.uid() = user_id
    AND can_delete_video(id)
  );
```

### reservations
```sql
-- ユーザーは自分の予約のみ
CREATE POLICY reservations_user ON reservations
  FOR ALL USING (auth.uid() = user_id);
```

### templates
```sql
-- 全ユーザー読み取り可、管理者のみ変更可
CREATE POLICY templates_read ON templates
  FOR SELECT USING (true);

CREATE POLICY templates_admin ON templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE supabase_uid = auth.uid() AND role = 'admin')
  );
```

### payments
```sql
-- ユーザーは自分の決済履歴のみ
CREATE POLICY payments_user ON payments
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 2. 認証方式

### LINE Login + JWT

**方針**: LINE Login単独認証 + JWTセッション管理

**認証フロー**:
1. `/api/auth/line` - LINE認証開始 (state生成、Cookie保存)
2. LINE認可画面 → 認証
3. `/api/auth/line/callback` - コールバック処理
   - state検証 (CSRF対策)
   - トークン交換
   - ID Token検証
   - プロフィール取得
   - ユーザーupsert
   - JWTセッション発行

**セキュリティ対策**:
- CSRF: state パラメータで保護 (nanoid生成、Cookie保存、検証)
- XSS: HttpOnly Cookie
- セッション固定: 認証成功時に新規JWT発行

**JWT Cookie属性**:
```typescript
{
  httpOnly: true,
  secure: true,  // 本番環境のみ
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,  // 30日
}
```

**JWT設計**:
- 有効期限: 30日
- ローテーション: 残り7日未満でアクセス時に再発行
- ペイロード: `{ openId, name, iat, exp }`
- 署名: HS256 (jose)

**usersテーブル管理**:
```typescript
// 初回サインイン時にusersレコード作成/更新
async function upsertUser(data: { openId, name, email, loginMethod }) {
  await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    loginMethod: "line",
    role: data.openId === ENV.ownerOpenId ? "admin" : "user",
  }).onConflictDoUpdate({
    target: users.openId,
    set: { name, email, lastSignedIn: new Date() }
  });
}
```

**注意点**:
- LINE Loginはメールアドレスが取得できない場合あり
- `email`はnullable設定

---

## 3. 動画削除制約

### 削除可能条件

動画は以下の全条件を満たす場合のみ削除可能:

| 条件 | 説明 |
|------|------|
| 所有者 | auth.uid() = video.user_id |
| 予約なし | hold/confirmed/completedの予約に紐付いていない |
| 生成完了 | status = 'completed' または 'failed' |

### 削除チェック関数

```sql
-- 削除前チェック関数
CREATE OR REPLACE FUNCTION can_delete_video(video_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM reservations
    WHERE video_id = $1
    AND status IN ('hold', 'confirmed', 'completed')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### アプリケーション側チェック

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

---

## 4. 管理者権限

### 複数管理者対応

環境変数で複数の管理者を登録可能。

| 環境変数 | 形式 | 説明 |
|---------|------|------|
| `ADMIN_OPEN_IDS` | カンマ区切り | 複数の管理者OpenIDを指定（例: `id1,id2,id3`） |

### 判定ロジック（SSOT）

管理者判定は `src/lib/auth/admin.ts` に集約（Single Source of Truth）。

```typescript
// 管理者ID一覧を取得
function getAdminOpenIds(): string[] {
  return (process.env.ADMIN_OPEN_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

// 管理者判定
function isAdminOpenId(openId: string): boolean {
  return getAdminOpenIds().includes(openId);
}
```

### admin判定（従来方式・DBロール）
```typescript
async function isAdmin(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.supabase_uid, userId)
  });
  return user?.role === 'admin';
}
```

### 管理者専用操作
- テンプレートCRUD
- テンプレート動画アップロード
- 投影スケジュール管理
- 投影完了マーク
- 強制キャンセル・返金

---

## 5. レート制限

### 概要

API乱用防止のため、エンドポイント別にレート制限を設定。

### 実装方式

**Upstash Redis + @upstash/ratelimit** を使用（Railway環境対応）。

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// スライディングウィンドウ方式
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  analytics: true,
});
```

### エンドポイント別制限

| エンドポイント | 制限 | 識別子 | 理由 |
|---------------|------|--------|------|
| `POST /api/auth/*` | 5回/分 | IP | ブルートフォース防止 |
| `POST /api/video/create` | 3回/分 | User | レンダリングコスト |
| `POST /api/reservations/hold` | 10回/分 | User | スロット乱用防止 |
| `POST /api/checkout` | 5回/分 | User | 決済乱用防止 |
| `GET /api/*` | 60回/分 | User | 一般的な保護 |
| `POST /api/webhooks/*` | 制限なし | - | Stripe等からの通知 |

### ミドルウェア実装

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Webhook は除外
  if (request.nextUrl.pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  const identifier = getIdentifier(request);
  const endpoint = getEndpointCategory(request.nextUrl.pathname);
  const limit = RATE_LIMITS[endpoint];

  const { success, remaining, reset } = await ratelimit.limit(
    `${endpoint}:${identifier}`
  );

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: reset },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }

  return NextResponse.next();
}

function getIdentifier(request: NextRequest): string {
  // 認証済みユーザーはユーザーID、未認証はIP
  const userId = request.headers.get('x-user-id');
  if (userId) return `user:${userId}`;

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || request.ip || 'unknown';
  return `ip:${ip}`;
}
```

### 制限超過時の応答

```json
{
  "error": "Too many requests",
  "message": "リクエスト数の上限に達しました。しばらく待ってから再試行してください。",
  "retryAfter": 1705123456789
}
```

**HTTPヘッダー**:
- `X-RateLimit-Remaining`: 残りリクエスト数
- `X-RateLimit-Reset`: リセット時刻（Unix timestamp）
- `Retry-After`: 再試行までの秒数

### フロントエンド対応

```typescript
async function fetchWithRateLimit(url: string, options?: RequestInit) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = response.headers.get('Retry-After');

    toast.error(`リクエスト数の上限に達しました。${retryAfter}秒後に再試行してください。`);

    throw new RateLimitError(data.message, Number(retryAfter));
  }

  return response;
}
```

---

## 6. CSRF対策

### Server Actions

Next.js App RouterのServer Actionsは、デフォルトでCSRFトークン検証を行う。

### Route Handlers

外部からのWebhookを除き、Same-Origin Policyで保護。

```typescript
// Webhookの署名検証
async function verifyStripeWebhook(request: Request): Promise<Stripe.Event> {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  return stripe.webhooks.constructEvent(
    body,
    signature!,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
```

---

## 7. 入力検証

### Zodスキーマ

全ての入力はZodスキーマで検証。

```typescript
// lib/validations/reservation.ts
import { z } from 'zod';

export const holdSlotSchema = z.object({
  videoId: z.number().int().positive(),
  projectionDate: z.coerce.date().refine(
    (date) => date > new Date(),
    { message: '過去の日付は指定できません' }
  ),
  slotNumber: z.number().int().min(1).max(4),
  idempotencyKey: z.string().uuid(),
});

// Server Action内で使用
export async function holdSlot(input: unknown) {
  const data = holdSlotSchema.parse(input);
  // ...
}
```

### SQLインジェクション対策

Drizzle ORMのパラメータ化クエリを使用。生SQLは禁止。

```typescript
// OK: パラメータ化クエリ
await db.query.reservations.findMany({
  where: eq(reservations.user_id, userId)
});

// NG: 文字列結合（禁止）
// await db.execute(`SELECT * FROM reservations WHERE user_id = ${userId}`);
```
