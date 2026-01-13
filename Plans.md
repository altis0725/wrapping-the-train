# Plans.md - WRAPPING THE TRAIN

水間鉄道プロジェクションマッピング予約システム

## 現在の状態

**フェーズ**: Phase 1 MVP 実装中
**現在のSprint**: Sprint 3 (公開ページ)

---

## Sprint 1: 基盤構築 (完了)

### 1.1 プロジェクト初期化
- [x] `cc:完了` Next.js 16 プロジェクト作成
- [x] `cc:完了` 依存関係インストール (drizzle-orm, zod, stripe, lucide-react)
- [x] `cc:完了` shadcn/ui セットアップ
- [x] `cc:完了` ディレクトリ構造作成

### 1.2 DB接続設定
- [x] `cc:完了` Drizzle + postgres 直接接続設定
- [x] `cc:完了` 環境変数テンプレート作成 (.env.example)

### 1.3 Drizzle ORM & DBスキーマ
- [x] `cc:完了` Drizzle 設定 (drizzle.config.ts)
- [x] `cc:完了` 全テーブル定義 (users, templates, videos, reservations, payments, projection_schedules, stripe_events, compensation_logs, state_transition_logs)
- [x] `cc:完了` インデックス定義

---

## Sprint 2: 認証 (完了)

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

---

## 次のSprint (Sprint 3-8 概要)

| Sprint | 内容 | タスク数 |
|--------|------|---------|
| 3 | 公開ページ (LP/静的) | 8 |
| 4 | 動画作成機能 | 14 |
| 5 | 予約・決済 | 14 |
| 6 | マイページ | 7 |
| 7 | 管理画面 | 12 |
| 8 | 品質・運用 | 7 |

詳細は `.docs/spec/` の仕様書を参照。

---

## 完了タスク

### Sprint 1: 基盤構築 (2026-01-12)
- Next.js 16 (App Router) プロジェクト作成
- 依存関係インストール (Drizzle, Zod, Stripe, Lucide)
- shadcn/ui セットアップ (Tailwind CSS, CSS変数)
- ディレクトリ構造作成 (CLAUDE.md準拠)
- Drizzle + postgres 直接接続設定
- 環境変数テンプレート (.env.example)
- Drizzle ORM 設定 (drizzle.config.ts)
- 全テーブル定義 (9テーブル + リレーション + 型エクスポート)
- インデックス定義 (パフォーマンス最適化用)

### Sprint 2: 認証 (2026-01-12)
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

---

## 設計判断ログ

| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-01-12 | ハーネス導入 | Solo モードで開発開始 |
| 2026-01-12 | Sprint 分割 | 依存関係を考慮し8スプリントに分割 |
| 2026-01-12 | Supabase削除 → LINE認証 | LINE Loginのみ使用、Supabase不要に。参照実装: train-canvas |
| 2026-01-12 | JWT + jose | Supabase Session不要、jose で軽量実装 |
