# WRAPPING THE TRAIN

水間鉄道プロジェクションマッピング予約システム

## 技術スタック

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: LINE Login + JWT
- **Payment**: Stripe
- **Video**: Shotstack (ルママスク合成)
- **UI**: Tailwind CSS + shadcn/ui
- **Deploy**: Railway

## 必要要件

- Node.js 18+
- Docker (PostgreSQL用)
- LINE Developers アカウント
- Stripe アカウント
- Shotstack アカウント

## クイックスタート

### 1. 依存パッケージインストール

```bash
npm install
```

### 2. 環境変数設定

```bash
cp .env.example .env.local
```

`.env.local` を編集して各種APIキーを設定:

| 変数 | 説明 |
|-----|------|
| `DATABASE_URL` | PostgreSQL接続URL |
| `LINE_CHANNEL_ID` | LINE Login チャネルID |
| `LINE_CHANNEL_SECRET` | LINE Login チャネルシークレット |
| `JWT_SECRET` | セッション署名キー (32文字以上) |
| `STRIPE_SECRET_KEY` | Stripe シークレットキー |
| `STRIPE_PUBLISHABLE_KEY` | Stripe 公開キー |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook シークレット |
| `SHOTSTACK_API_KEY` | Shotstack APIキー |
| `OWNER_OPEN_ID` | 管理者のLINE OpenID |

### 3. データベース起動

```bash
docker-compose up -d
```

### 4. スキーマ適用

```bash
npm run db:push
```

### 5. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能

## 主要コマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLint 実行 |
| `npm run test` | ユニットテスト |
| `npm run test:e2e` | E2Eテスト |
| `npm run db:push` | DBスキーマ適用 |
| `npm run db:studio` | DB管理UI |
| `npm run db:migrate` | マイグレーション実行 |

## ドキュメント

- [開発ガイドライン](./CLAUDE.md) - 開発規約とディレクトリ構成
- [仕様書](./.docs/spec/README.md) - システム仕様の詳細
