# WRAPPING THE TRAIN - 開発ガイドライン

水間鉄道プロジェクションマッピング予約システム

## 技術スタック

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: LINE Login + JWT (jose)
- **DB**: PostgreSQL (Drizzle ORM 直接接続)
- **Payment**: Stripe
- **Video**: Shotstack (ルママスク合成)
- **Deploy**: Railway

## ディレクトリ構成

```
.docs/
├── spec/                    # 仕様書 (詳細は spec/README.md 参照)
│   ├── README.md            # 仕様書構成ガイド
│   ├── overview.md          # システム概要
│   ├── screens.md           # 画面仕様
│   ├── database.md          # DB設計
│   ├── api.md               # API仕様
│   ├── business-logic.md    # ビジネスロジック
│   ├── state-machine.md     # 状態遷移表
│   ├── security.md          # RLS・認証・削除制約
│   ├── error-handling.md    # 失敗時補償・冪等性
│   ├── integrations.md      # 外部連携
│   └── phase2/              # Phase 2 仕様
└── design-mock/             # デザインモック

src/
├── actions/                 # Server Actions
├── app/
│   ├── (public)/            # 公開ページ (/, /create, /mypage等)
│   ├── admin/               # 管理画面
│   └── api/                 # Route Handlers
├── components/
│   ├── ui/                  # shadcn/ui (変更しない)
│   ├── common/              # 共通コンポーネント
│   └── [feature]/           # 機能別コンポーネント
├── db/
│   └── schema.ts            # Drizzleスキーマ
├── lib/
│   ├── auth/                # 認証 (LINE OAuth, JWT session)
│   ├── services/            # ビジネスロジック
│   ├── validations/         # Zodスキーマ
│   └── shotstack.ts         # Shotstack連携
└── middleware.ts            # JWT検証・ルート保護

e2e/                         # E2Eテスト (Playwright)
├── fixtures/                # テストデータ定義
├── helpers/                 # テストヘルパー
├── global-setup.ts          # テストセットアップ
├── global-teardown.ts       # テストクリーンアップ
└── *.spec.ts                # テストファイル
```

## 主要画面

| パス | 画面 | 概要 |
|------|------|------|
| `/` | Home | LP |
| `/create` | 動画作成 | 4段階テンプレート選択（背景6+窓1+車輪1+音楽1） |
| `/mypage` | マイページ | 動画/予約/決済管理 |
| `/reservations` | 投影予約 | Coming Soon（準備中） |
| `/admin` | 管理画面 | テンプレート/予約/統計/監査ログ |

## 動画作成フロー（60秒動画）

**4段階テンプレート選択**:

| ステップ | 選択内容 | 説明 |
|----------|----------|------|
| 1 | 背景 × 6 | 10秒ずつの背景映像を6つ選択 |
| 2 | 窓 × 1 | ルママスクで合成する窓映像 |
| 3 | 車輪 × 1 | ルママスクで合成する車輪映像 |
| 4 | 音楽 × 1 | BGMを選択 |

**テンプレートカテゴリ**:
| カテゴリID | 名称 |
|------------|------|
| 1 | 背景 |
| 2 | 窓 |
| 3 | 車輪 |
| 4 | 音楽 |

## 実装パターン

**RSC (Server Component)**: データ取得
**CC (Client Component)**: UI操作

```tsx
// page.tsx (RSC)
import "server-only";
export default async function Page() {
  const data = await db.query...
  return <PageContent data={data} />
}

// components/page-content.tsx (CC)
"use client"
export function PageContent({ data }) { ... }
```

## E2Eテスト

**テストファイル**:
| ファイル | 説明 |
|----------|------|
| `create-video.auth.spec.ts` | 動画作成フロー（4段階選択） |
| `free-video-creation.auth.spec.ts` | 無料動画作成の完全フロー |
| `reservation.auth.spec.ts` | 予約ページ（Coming Soon確認） |
| `reservation.data.spec.ts` | 予約ページ（動画あり） |
| `payment-flow.data.spec.ts` | 決済フロー |
| `admin.admin.spec.ts` | 管理画面 |

**テスト実行**:
```bash
# 全テスト実行
pnpm run test:e2e

# 特定のテストのみ
pnpm exec playwright test create-video
```

## 参照ドキュメント

**仕様書一覧**: [.docs/spec/README.md](.docs/spec/README.md)

### 基本仕様
- [システム概要](.docs/spec/overview.md)
- [画面仕様](.docs/spec/screens.md)
- [DB設計](.docs/spec/database.md)
- [API仕様](.docs/spec/api.md)
- [ビジネスロジック](.docs/spec/business-logic.md)

### 詳細仕様
- [状態遷移表](.docs/spec/state-machine.md)
- [セキュリティ・認証](.docs/spec/security.md)
- [エラーハンドリング](.docs/spec/error-handling.md)
- [外部連携](.docs/spec/integrations.md)

### Phase 2
- [物理配信](.docs/spec/phase2/projection-delivery.md)

### メタドキュメント
- [AIエージェント向けドキュメント作成原則](./agent-doc.md) - CLAUDE.md記述のベストプラクティス

## 参照実装 (train-canvas)

| ファイル | 用途 |
|---------|------|
| `~/Documents/train-canvas/server/_core/shotstack.ts` | ルママスク合成 |
| `~/Documents/train-canvas/server/_core/lineAuth.ts` | LINE認証フロー |
| `~/Documents/train-canvas/server/_core/sdk.ts` | JWTセッション管理 |
| `~/Documents/train-canvas/drizzle/schema.ts` | スキーマ定義 |
| `~/Documents/train-canvas/client/src/pages/CreateVideo.tsx` | 3段階選択UI |
