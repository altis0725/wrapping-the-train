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

- Node.js 24.0.0+
- pnpm 10.0.0+
- Docker & Docker Compose (PostgreSQL用)
- LINE Developers アカウント
- Stripe アカウント
- Shotstack アカウント

## クイックスタート

### 1. 依存パッケージインストール

```bash
pnpm install
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
pnpm run db:push
```

### 5. 開発サーバー起動

```bash
pnpm run dev
```

http://localhost:3000 でアクセス可能

## 主要コマンド

| コマンド | 説明 |
|---------|------|
| `pnpm run dev` | 開発サーバー起動 |
| `pnpm run build` | 本番ビルド |
| `pnpm run start` | 本番サーバー起動 |
| `pnpm run lint` | ESLint 実行 |
| `pnpm run test` | ユニットテスト |
| `pnpm run test:e2e` | E2Eテスト |
| `pnpm run db:push` | DBスキーマ適用 |
| `pnpm run db:studio` | DB管理UI |
| `pnpm run db:migrate` | マイグレーション実行 |

## 動画作成フロー

60秒の動画を作成するための4段階テンプレート選択:

| ステップ | 選択内容 | 説明 |
|----------|----------|------|
| 1 | 背景 × 6 | 10秒ずつの背景映像を6つ選択 |
| 2 | 窓 × 1 | ルママスクで合成する窓映像 |
| 3 | 車輪 × 1 | ルママスクで合成する車輪映像 |
| 4 | 音楽 × 1 | BGMを選択 |

## API エンドポイント

### 認証

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/auth/line` | LINE OAuth認証開始 |
| GET | `/api/auth/line/callback` | LINEコールバック処理 |
| GET/POST | `/api/auth/logout` | ログアウト |

### 動画

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/videos/[id]/status` | 動画レンダリング状態取得 |

### Webhook

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/webhooks/stripe` | Stripe決済イベント処理 |

### Cron (バックグラウンドジョブ)

| メソッド | パス | 説明 |
|---------|------|------|
| GET/POST | `/api/cron/cleanup-videos` | 期限切れ動画削除 |
| GET/POST | `/api/cron/release-holds` | 期限切れホールド解放 |

### システム

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/health` | ヘルスチェック |
| GET | `/api/dev-login` | 開発用ログイン (dev only) |
| GET | `/api/debug-auth` | 認証デバッグ (dev only) |

## 管理画面

管理画面 (`/admin`) へのアクセスには、環境変数 `OWNER_OPEN_ID` に設定されたLINE OpenIDでログインする必要があります。

**LINE OpenIDとは**: LINE Login APIを通じて取得できる一意の識別子で、`U`で始まる33文字の文字列です（例: `U1234567890abcdef...`）。LINE IDとは異なります。

管理画面の機能:
- テンプレート管理（背景/窓/車輪/音楽）
- 予約管理
- スケジュール管理
- 監査ログ

## ドキュメント

- [開発ガイドライン](./CLAUDE.md) - 開発規約とディレクトリ構成
- [仕様書](./.docs/spec/README.md) - システム仕様の詳細
