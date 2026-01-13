# Plans.md - WRAPPING THE TRAIN

水間鉄道プロジェクションマッピング予約システム

## 現在の状態

**フェーズ**: Phase 1 MVP 実装中
**現在のSprint**: Sprint 2 (認証)

---

## Sprint 1: 基盤構築 (完了)

### 1.1 プロジェクト初期化
- [x] `cc:完了` Next.js 16 プロジェクト作成
- [x] `cc:完了` 依存関係インストール (@supabase/supabase-js, drizzle-orm, zod, stripe, lucide-react)
- [x] `cc:完了` shadcn/ui セットアップ
- [x] `cc:完了` ディレクトリ構造作成

### 1.2 Supabase 設定
- [x] `cc:完了` Supabase クライアント設定 (client.ts, server.ts, middleware.ts)
- [x] `cc:完了` 環境変数テンプレート作成 (.env.example)

### 1.3 Drizzle ORM & DBスキーマ
- [x] `cc:完了` Drizzle 設定 (drizzle.config.ts)
- [x] `cc:完了` 全テーブル定義 (users, templates, videos, reservations, payments, projection_schedules, stripe_events, compensation_logs, state_transition_logs)
- [x] `cc:完了` インデックス定義

---

## 次のSprint (Sprint 2-8 概要)

| Sprint | 内容 | タスク数 |
|--------|------|---------|
| 2 | 認証 | 6 |
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
- 依存関係インストール (Supabase, Drizzle, Zod, Stripe, Lucide)
- shadcn/ui セットアップ (Tailwind CSS, CSS変数)
- ディレクトリ構造作成 (CLAUDE.md準拠)
- Supabase クライアント設定 (client/server/middleware)
- 環境変数テンプレート (.env.example)
- Drizzle ORM 設定 (drizzle.config.ts)
- 全テーブル定義 (9テーブル + リレーション + 型エクスポート)
- インデックス定義 (パフォーマンス最適化用)

---

## 設計判断ログ

| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-01-12 | ハーネス導入 | Solo モードで開発開始 |
| 2026-01-12 | Sprint 分割 | 依存関係を考慮し8スプリントに分割 |
