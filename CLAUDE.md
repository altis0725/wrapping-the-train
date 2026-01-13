# WRAPPING THE TRAIN - 開発ガイドライン

水間鉄道プロジェクションマッピング予約システム

## 技術スタック

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **DB/Auth**: Supabase (Auth, Database, Storage)
- **ORM**: Drizzle ORM
- **Payment**: Stripe
- **Video**: Shotstack (ルママスク合成)
- **Deploy**: Railway

## ディレクトリ構成

```
.docs/
├── spec/                    # 仕様書
│   ├── overview.md          # システム概要
│   ├── screens.md           # 画面仕様
│   ├── database.md          # DB設計
│   ├── api.md               # API仕様
│   └── business-logic.md    # ビジネスロジック
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
│   ├── services/            # ビジネスロジック
│   ├── validations/         # Zodスキーマ
│   └── shotstack.ts         # Shotstack連携
└── utils/
    └── supabase/            # Supabase設定
```

## 主要画面

| パス | 画面 | 概要 |
|------|------|------|
| `/` | Home | LP |
| `/create` | 動画作成 | 3段階テンプレート選択 |
| `/mypage` | マイページ | 動画/予約/決済管理 |
| `/reservations` | 投影予約 | 日時選択 |
| `/admin` | 管理画面 | テンプレート/予約/統計 |

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

## 参照ドキュメント

- [システム概要](.docs/spec/overview.md)
- [画面仕様](.docs/spec/screens.md)
- [DB設計](.docs/spec/database.md)
- [API仕様](.docs/spec/api.md)
- [ビジネスロジック](.docs/spec/business-logic.md)

## 参照実装 (train-canvas)

| ファイル | 用途 |
|---------|------|
| `~/Documents/train-canvas/server/_core/shotstack.ts` | ルママスク合成 |
| `~/Documents/train-canvas/drizzle/schema.ts` | スキーマ定義 |
| `~/Documents/train-canvas/client/src/pages/CreateVideo.tsx` | 3段階選択UI |
