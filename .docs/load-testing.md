# 負荷試験ガイド

## 概要

このドキュメントでは、本番環境を想定した負荷試験の実施方法を説明します。

## 試験対象

### 1. ポーリングエンドポイント

動画レンダリング状態のポーリング（最も負荷がかかる）

```bash
# Artillery でポーリング負荷試験
npx artillery quick --count 50 --num 100 \
  http://localhost:3000/api/videos/123/status
```

### 2. 予約スロット取得

```bash
npx artillery quick --count 20 --num 50 \
  "http://localhost:3000/api/reservations/slots?date=2026-01-15"
```

## 期待値

| エンドポイント | 同時接続数 | 応答時間 | 備考 |
|---------------|-----------|---------|------|
| /api/videos/*/status | 100 | < 500ms | ポーリング |
| /api/reservations/slots | 50 | < 300ms | 日次取得 |
| /api/health | 10 | < 100ms | ヘルスチェック |

## DB接続プール設定

Railway PostgreSQL のデフォルト `max_connections` は 100。
アプリケーション側で接続数を制限する必要がある場合:

```typescript
// src/db/index.ts
const client = postgres(connectionString, {
  prepare: false,
  max: 10, // 最大接続数
});
```

## 対策

### バックオフ強化

クライアント側でExponential Backoffを実装:

```typescript
const poll = async (videoId: number, attempt = 0) => {
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
  await new Promise(r => setTimeout(r, delay));
  // ...
};
```

### レート制限

必要に応じて `middleware.ts` でレート制限を実装。

## 実行環境

- **ローカル**: docker-compose + npm run dev
- **Railway Preview**: PR作成時に自動デプロイされた環境

Railway Preview を使用した負荷試験が推奨（本番同等のリソース）。
