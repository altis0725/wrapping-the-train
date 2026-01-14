# Sprint 2: 認証

**状態**: 完了
**完了日**: 2026-01-12

## タスク一覧

### 2.1 Supabase削除・依存関係変更
- [x] `cc:完了` @supabase/* パッケージ削除
- [x] `cc:完了` jose, nanoid 追加
- [x] `cc:完了` Supabaseクライアントファイル削除

### 2.2 LINE認証実装
- [x] `cc:完了` LINE OAuth API通信 (src/lib/auth/line.ts)
- [x] `cc:完了` JWTセッション管理 (src/lib/auth/session.ts)
- [x] `cc:完了` 認証定数・環境変数 (src/lib/auth/constants.ts)

### 2.3 認証ルートハンドラー
- [x] `cc:完了` ログイン開始 (/api/auth/line)
- [x] `cc:完了` コールバック (/api/auth/line/callback)
- [x] `cc:完了` ログアウト (/api/auth/logout)

### 2.4 Middleware・UI
- [x] `cc:完了` JWT検証ミドルウェア (src/middleware.ts)
- [x] `cc:完了` ログインページ (src/app/(public)/login/page.tsx)
- [x] `cc:完了` ユーザーサービス (src/lib/services/user.ts)

### 2.5 スキーマ・仕様書更新
- [x] `cc:完了` DBスキーマ更新 (supabaseUid → openId)
- [x] `cc:完了` セキュリティ仕様書更新 (.docs/spec/security.md)
- [x] `cc:完了` DB仕様書更新 (.docs/spec/database.md)

## 完了サマリー

- Supabase Auth 削除 → LINE Login + JWT (jose) に変更
- LINE OAuth 2.0 認証フロー実装 (state CSRF対策付き)
- JWT セッション管理 (30日有効、7日未満でローテーション)
- Cookie セキュリティ (HttpOnly, Secure, SameSite=lax)
- 認証ルートハンドラー (/api/auth/line, /api/auth/line/callback, /api/auth/logout)
- ミドルウェア更新 (JWT検証、保護ルート)
- ログインページ作成 (/login)
- ユーザーサービス (upsert, getByOpenId, isAdmin)
- DBスキーマ更新 (supabaseUid → openId)
- セキュリティ仕様書・DB仕様書更新
