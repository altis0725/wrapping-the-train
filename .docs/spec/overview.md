# システム概要

## サービス目的

水間鉄道の夜間停車車両にユーザー作成動画をプロジェクションマッピングで投影する体験型サービス。

## 技術スタック

| 領域 | 技術 |
|------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS + shadcn/ui |
| DB/Auth | Supabase |
| ORM | Drizzle ORM |
| 決済 | Stripe |
| 動画生成 | Shotstack (ルママスク合成) |
| デプロイ | Railway |

## 料金プラン

| 項目 | 無料 | 有料 (5,000円) |
|------|------|----------------|
| Shotstack | サンドボックス | 本番 |
| 投影予約 | 不可 | 可能 |
| 動画保持 | 1週間 | 永続 |
| 決済 | - | 動画作成時 |

## 認証

Supabase Auth (Email/Password + Google + LINE)
