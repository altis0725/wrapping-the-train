# 仕様書構成

水間鉄道プロジェクションマッピング予約システムの仕様書一覧。

## ディレクトリ構成

```
.docs/spec/
├── README.md              # このファイル
├── overview.md            # システム概要・技術スタック
├── screens.md             # 画面仕様
├── database.md            # DB設計・テーブル定義
├── api.md                 # API仕様・Server Actions・Edge Functions
├── business-logic.md      # ビジネスロジック・フロー
├── state-machine.md       # 状態遷移表
├── security.md            # RLS・認証・削除制約
├── error-handling.md      # 失敗時補償・Webhook冪等性
├── integrations.md        # 外部連携（Shotstack/Stripe/タイムゾーン）
└── phase2/
    └── projection-delivery.md  # 物理配信仕様（Phase 2）
```

## ファイル概要

### 基本仕様

| ファイル | 内容 |
|---------|------|
| [overview.md](./overview.md) | サービス目的、技術スタック、料金プラン |
| [screens.md](./screens.md) | 各画面の仕様、UI要素、フロー |
| [database.md](./database.md) | テーブル定義、カラム、制約 |
| [api.md](./api.md) | Server Actions、Route Handlers、Edge Functions |
| [business-logic.md](./business-logic.md) | 予約フロー、動画生成フロー、ルール |

### 詳細仕様

| ファイル | 内容 |
|---------|------|
| [state-machine.md](./state-machine.md) | videos/reservations/paymentsの状態遷移 |
| [security.md](./security.md) | RLSポリシー、アカウント統合、削除制約、レート制限 |
| [error-handling.md](./error-handling.md) | リトライ処理、返金処理、冪等性、補償SLA |
| [integrations.md](./integrations.md) | Shotstack連携、Stripe連携、タイムゾーン |
| [race-conditions.md](./race-conditions.md) | 競合シナリオと解決規則、冪等性トークン |

### 運用・品質

| ファイル | 内容 |
|---------|------|
| [operations.md](./operations.md) | ログ戦略、メトリクス、アラート、バックアップ |
| [testing.md](./testing.md) | 単体/統合/E2Eテスト戦略 |
| [notifications.md](./notifications.md) | メール通知、アプリ内通知、管理者通知 |
| [privacy.md](./privacy.md) | データ保護、GDPR対応、データ主体の権利 |
| [performance.md](./performance.md) | キャッシュ戦略、CDN、DB最適化 |

### Phase 2

| ファイル | 内容 |
|---------|------|
| [phase2/projection-delivery.md](./phase2/projection-delivery.md) | 現地投影PC向け配信API |

## 読む順序（推奨）

1. **overview.md** - システム全体像を把握
2. **screens.md** - ユーザー体験を理解
3. **business-logic.md** - 主要フローを理解
4. **database.md** - データ構造を理解
5. **api.md** - 実装インターフェースを理解
6. **state-machine.md** - 状態管理を理解
7. **security.md** / **error-handling.md** / **integrations.md** - 詳細仕様
