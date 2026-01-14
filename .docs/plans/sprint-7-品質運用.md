# Sprint 7: 品質・運用・バッファ

**状態**: ✅ 完了
**目標**: 負荷試験・E2E・デプロイ準備 + バグ修正バッファ

---

## 開発環境戦略 (LLM Debate 結論: 2026-01-13)

**ハイブリッド構成**を採用。ローカル汚染を最小限に抑えつつ、高速な開発サイクルを維持する。

### 環境構成

| フェーズ | 環境 | 用途 |
|----------|------|------|
| 実装・単体テスト | ローカル + Docker (DBのみ) | 高速Feedback Loop (HMR) |
| 統合検証 | Railway Preview | E2E・Cron・負荷試験 |

### ローカル環境 (docker-compose.yml)

```yaml
services:
  db:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: wrapping_train
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
```

- **Node.js**: ホストで直接実行 (`npm run dev`)
- **PostgreSQL**: Dockerコンテナで隔離
- **Vitest**: ローカルで即時実行

### Railway Preview 環境

- **トリガー**: PR作成時に自動デプロイ
- **用途**:
  - E2Eテスト (Playwright → Preview URL)
  - Cron動作検証 (Railway固有機能)
  - 負荷試験 (本番同等リソース)

### 判断理由

| 選択肢 | 評価 | 理由 |
|--------|------|------|
| Docker Compose のみ | △ | Cron検証が不可、本番差異リスク |
| Railway Preview のみ | ✗ | Feedback Loop遅延 (数分/変更)、単体テストに不向き |
| **ハイブリッド** | ◎ | 両者の長所を活かす |

> 参照: `/Users/altis/debate/llm-debate-20260113-Sprint7開発環境選定/`

---

## タスク一覧

### 7.1 Cron: 期限切れ動画削除
- [x] /api/cron/cleanup-videos
  - 毎日 3:00 JST 実行
  - expires_at < NOW() の動画を取得
  - 有効な予約に紐付いていない動画のみ削除
  - DBレコード削除
- [x] Railway Cron 設定 (railway.toml)

### 7.2 KPI ダッシュボード
- [x] 統計集計設計
  - 日別集計クエリ
  - 動画数 / 予約数 / 売上
- [x] グラフ表示 (recharts)
  - 日別推移（30日間）
- [x] 管理画面ホームに配置

### 7.3 通知機能
- [x] 管理者通知 (Slack/コンソール)
  - 動画生成3回失敗
  - 決済エラー
  - 異常検知
- [x] 通知設定 (SLACK_WEBHOOK_URL)

### 7.4 E2E テスト
- [x] Playwright セットアップ
- [x] 基本フローテスト
  - ホームページ表示
  - ナビゲーション
  - 認証フロー（未認証アクセス防止）
- [ ] 主要フローテスト（将来拡張）
  - 動画作成 → 予約 → 決済 → 完了
  - キャンセル → 返金

### 7.5 API 単体テスト
- [x] Vitest セットアップ
- [x] バリデーションテスト
  - 動画作成スキーマ
  - 予約スキーマ
- [x] 通知機能テスト

### 7.6 負荷試験
- [x] 負荷試験ガイド作成 (.docs/load-testing.md)
- [x] ポーリング負荷確認の手順
- [x] 対策方針（バックオフ・コネクションプーリング）

### 7.7 デプロイ
- [x] Railway 設定 (railway.toml)
  - nixpacks ビルド
  - Cron設定
  - ヘルスチェック
- [x] 本番環境変数サンプル (.env.example)
- [x] ヘルスチェックAPI (/api/health)

### 7.8 バッファ
- [x] docker-compose.yml 作成
- [x] ドキュメント整備

---

## 完了条件 (Definition of Done)

- [x] E2Eテストが基本フローをカバーしている
- [x] 本番環境にデプロイ可能な状態
- [x] 期限切れ動画が自動削除される仕組み
- [x] 管理者が異常を通知で把握できる
- [x] KPIダッシュボードで運用状況が確認できる

---

## 作成ファイル一覧

| ファイル | 説明 |
|---------|------|
| `src/app/api/cron/cleanup-videos/route.ts` | 期限切れ動画削除Cron |
| `src/app/api/health/route.ts` | ヘルスチェックAPI |
| `src/lib/notifications.ts` | 通知機能 |
| `src/components/admin/kpi-chart.tsx` | KPIグラフコンポーネント |
| `docker-compose.yml` | ローカル開発用DB |
| `railway.toml` | Railwayデプロイ設定 |
| `vitest.config.mts` | Vitest設定 |
| `playwright.config.ts` | Playwright設定 |
| `tests/setup.ts` | テストセットアップ |
| `tests/lib/notifications.test.ts` | 通知テスト |
| `tests/lib/validations.test.ts` | バリデーションテスト |
| `tests/lib/validations-reservation.test.ts` | 予約バリデーションテスト |
| `e2e/home.spec.ts` | E2Eテスト |
| `.docs/load-testing.md` | 負荷試験ガイド |

---

## 参照仕様
- [エラーハンドリング](.docs/spec/error-handling.md)
- [ビジネスロジック - 失敗時補償](.docs/spec/business-logic.md#失敗時補償)
