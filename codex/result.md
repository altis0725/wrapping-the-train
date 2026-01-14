# Assign Codex: 以下のLINE認証実装計画をレビューしてください。セキュリティ、設計の妥当性、潜在的な問題点を指摘してください。

## タスク
以下のLINE認証実装計画をレビューしてください。セキュリティ、設計の妥当性、潜在的な問題点を指摘してください。

## 共有コンテキスト
# Sprint 2: LINE認証実装計画

## 概要

Supabase Authを削除し、LINE Login + JWT (jose) による独自認証に変更。
参照実装: `~/Documents/train-canvas/server/_core/`

## 変更方針

| 項目 | Before | After |
|------|--------|-------|
| 認証 | Supabase Auth | LINE Login + JWT |
| DB接続 | Supabase Client | Drizzle + postgres直接 |
| セッション | Supabase Session | JWT Cookie |
| ユーザーID | supabase_uid | openId (LINE userId) |

## 実装タスク

### 2.1 Supabase削除・DB接続変更

**削除ファイル**:
- `src/utils/supabase/client.ts`
- `src/utils/supabase/server.ts`
- `src/utils/supabase/middleware.ts`

**更新ファイル**:
- `src/db/schema.ts` - `supabaseUid` → `openId` に変更
- `.env.example` - Supabase変数削除、LINE変数追加
- `package.json` - `@supabase/*` 削除、`jose` `nanoid` 追加

### 2.2 LINE認証コア実装
**参照**: `~/Documents/train-canvas/server/_core/lineAuth.ts`

**新規ファイル**: `src/lib/auth/line.ts`
```typescript
// LINE API通信
getLineAuthUrl(state, redirectUri): string
getLineToken(code, redirectUri): Promise<TokenData>
getLineProfile(accessToken): Promise<Profile>
verifyLineToken(idToken): Promise<IdTokenData>
```

### 2.3 JWT セッション管理
**参照**: `~/Documents/train-canvas/server/_core/sdk.ts`

**新規ファイル**: `src/lib/auth/session.ts`
```typescript
createSessionToken(openId, options): Promise<string>
verifySession(token): Promise<SessionPayload | null>
getCurrentUser(cookies): Promise<User | null>
```

### 2.4 認証ルートハンドラー
**参照**: `~/Documents/train-canvas/server/_core/lineAuthRoutes.ts`

**新規ファイル**:
- `src/app/api/auth/line/route.ts` - ログイン開始
- `src/app/api/auth/line/callback/route.ts` - コールバック処理
- `src/app/api/auth/logout/route.ts` - ログアウト

### 2.5 Middleware更新

**更新ファイル**: `src/middleware.ts`
- JWT Cookie検証に変更
- 保護ルート: `/create`, `/mypage`, `/reservations`
- Admin保護: `/admin`

### 2.6 ログインページ

**新規ファイル**: `src/app/(public)/login/page.tsx`
- LINE Loginボタンのみ
- シンプルなUI

### 2.7 DBユーザー操作

**新規ファイル**: `src/lib/services/user.ts`
```typescript
upsertUser(data): Promise<void>
getUserByOpenId(openId): Promise<User | null>
isAdmin(openId): Promise<boolean>
```

## ファイル構成 (最終)

```
src/
├── app/
│   ├── (public)/
│   │   └── login/page.tsx           # 新規
│   └── api/
│       └── auth/
│           ├── line/route.ts        # 新規
│           ├── line/callback/route.ts # 新規
│           └── logout/route.ts      # 新規
├── lib/
│   ├── auth/
│   │   ├── line.ts                  # 新規
│   │   ├── session.ts               # 新規
│   │   └── constants.ts             # 新規
│   └── services/
│       └── user.ts                  # 新規
├── db/
│   ├── index.ts                     # 更新
│   └── schema.ts                    # 更新 (openId)
├── middleware.ts                    # 更新 (JWT検証)
└── utils/
    └── supabase/                    # 削除
```

## 環境変数 (.env.example)

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# LINE Login
LINE_CHANNEL_ID=your-channel-id
LINE_CHANNEL_SECRET=your-channel-secret

# JWT
JWT_SECRET=your-jwt-secret-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
OWNER_OPEN_ID=admin-line-user-id
```

## スキーマ変更

```typescript
// Before
supabaseUid: varchar("supabase_uid", { length: 64 }).notNull().unique()

// After
openId: varchar("open_id", { length: 64 }).notNull().unique()
loginMethod: varchar("login_method", { length: 64 }).default("line")
lastSignedIn: timestamp("last_signed_in").defaultNow()
```

## 検証手順

1. `npm run dev` で起動
2. `/login` → LINE Loginボタンクリック
3. LINE認証 → コールバック → `/mypage` にリダイレクト
4. Cookie `app_session_id` が設定されていることを確認
5. 保護ルート `/create` にアクセス可能
6. ログアウト → Cookie削除 → `/login` にリダイレクト
7. `npm run build` 成功

## 必要なLINE設定

LINE Developers Console:
1. Messaging API チャネル作成
2. LINE Login 有効化
3. Callback URL: `{APP_URL}/api/auth/line/callback`
4. Scope: `profile openid email`


## Codex (GPT-5.2) の実行結果
**Findings**
- Critical: Missing CSRF/state verification details for LINE OAuth. `state` must be generated per request, stored server-side (or signed), and verified in callback to prevent login CSRF; plan doesn’t mention storage or verification.
- Critical: JWT cookie security attributes not specified. Must set `HttpOnly`, `Secure` (prod), `SameSite=Lax` or `Strict`, `Path=/`, and consider `Max-Age`/`Expires`. Missing increases XSS/session fixation risk.
- High: No refresh/rotation strategy. If JWT is long-lived and stored in cookie, compromise = long access; if short-lived, you need refresh flow or re-login UX. Plan doesn’t specify TTL or rotation.
- High: ID token validation requirements not spelled out. LINE ID token must be verified with issuer/audience/nonce, signature, and `exp`. Plan only mentions `verifyLineToken` but not required claims.
- High: OpenId as primary user ID could change if LINE account deleted/recreated; consider stable internal UUID and map `openId` to it to avoid orphan data and enable future auth methods.
- Medium: Admin auth based on `OWNER_OPEN_ID` in env risks manual mistakes and hard‑to‑audit access. Consider a DB role table, or at least validate on startup and log mismatches.
- Medium: Logout route should also revoke LINE access token if stored and clear cookie with same attributes used on set; plan doesn’t mention token revocation.
- Medium: `getLineProfile` call likely needs access token; if token isn’t stored or refreshed, profile fetch failures will break user data updates. Clarify what’s persisted.
- Low: `loginMethod` default “line” but no plan for migration/backfill or uniqueness constraints when switching existing supabase users.
- Low: `lastSignedIn` uses `defaultNow()` but should be updated on every login; default alone won’t update.

**Open questions / assumptions**
- Are you storing LINE access/refresh tokens? If yes, need encryption at rest and rotation; if no, what data are you using to populate user profile?
- How will you handle email scope unavailability or user denial (LINE often omits email)?
- Do you need multi-device sessions or a single session per user? That affects token invalidation strategy.

**Change summary (what’s solid)**
- Plan is directionally fine: replace Supabase Auth with LINE Login + JWT, update middleware, and centralize auth/session logic under `src/lib/auth`.

**Suggested next steps**
1) Specify OAuth state/nonce storage + verification strategy for LINE callback.  
2) Define JWT cookie attributes and TTL/rotation policy.  
3) Document ID token validation requirements and claim checks.  
4) Decide on internal user ID vs `openId` mapping for future‑proofing.


---
*生成日時: 2026-01-13T06:52:58.825Z*
