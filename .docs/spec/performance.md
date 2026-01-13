# パフォーマンス最適化

## 概要

動画配信サービスとしてのパフォーマンス要件と最適化戦略を定義。

---

## 1. パフォーマンス目標

| メトリクス | 目標値 | 測定方法 |
|-----------|--------|---------|
| TTFB (Time to First Byte) | < 200ms | Lighthouse |
| LCP (Largest Contentful Paint) | < 2.5s | Core Web Vitals |
| FID (First Input Delay) | < 100ms | Core Web Vitals |
| CLS (Cumulative Layout Shift) | < 0.1 | Core Web Vitals |
| API応答時間 (P95) | < 500ms | 内部メトリクス |
| 動画再生開始 | < 3s | カスタム計測 |

---

## 2. キャッシュ戦略

### 2.1 CDN（Cloudflare）

Supabase StorageのCDNに加え、アプリケーションレベルでCloudflareを使用。

```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};
```

### 2.2 ブラウザキャッシュ

```typescript
// 静的アセット
// Cache-Control: public, max-age=31536000, immutable

// API応答
const cacheHeaders = {
  // テンプレート一覧（頻繁に変わらない）
  templates: 'public, max-age=3600, stale-while-revalidate=86400',

  // スロット情報（リアルタイム性が必要）
  slots: 'private, max-age=0, must-revalidate',

  // ユーザーデータ
  userData: 'private, no-store',
};
```

### 2.3 サーバーサイドキャッシュ

```typescript
// Next.js unstable_cache
import { unstable_cache } from 'next/cache';

export const getTemplates = unstable_cache(
  async () => {
    return await db.query.templates.findMany({
      where: eq(templates.is_active, true),
      orderBy: templates.display_order,
    });
  },
  ['templates'],
  { revalidate: 3600, tags: ['templates'] }
);

// 手動無効化
import { revalidateTag } from 'next/cache';
await revalidateTag('templates');
```

### 2.4 Redis キャッシュ（Upstash）

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function getCachedSlots(date: string): Promise<Slot[] | null> {
  return await redis.get(`slots:${date}`);
}

export async function setCachedSlots(date: string, slots: Slot[]): Promise<void> {
  // 5分間キャッシュ
  await redis.set(`slots:${date}`, slots, { ex: 300 });
}

export async function invalidateSlotCache(date: string): Promise<void> {
  await redis.del(`slots:${date}`);
}
```

---

## 3. 動画配信最適化

### 3.1 動画フォーマット

```typescript
// Shotstack出力設定
const renderConfig = {
  output: {
    format: 'mp4',
    resolution: 'hd', // 1280x720
    aspectRatio: '16:9',
    fps: 30,
  },
};
```

### 3.2 ストリーミング配信

```typescript
// 動画URLは直接Supabase Storageから配信
// HLS/DASHは現時点では不要（短尺動画のため）

// 将来的にHLS対応が必要な場合
const hlsConfig = {
  segmentDuration: 6,
  playlistType: 'vod',
};
```

### 3.3 プレロード戦略

```tsx
// プレビュー時は低解像度、再生時に高解像度
function VideoPreview({ thumbnailUrl, videoUrl }: Props) {
  return (
    <>
      <link rel="preload" href={thumbnailUrl} as="image" />
      <link rel="prefetch" href={videoUrl} as="fetch" />
    </>
  );
}
```

---

## 4. データベース最適化

### 4.1 インデックス設計

```sql
-- 予約検索（日付・スロット）
CREATE INDEX CONCURRENTLY reservations_date_slot_idx
ON reservations(projection_date, slot_number)
WHERE status NOT IN ('expired', 'cancelled');

-- 動画検索（ユーザー・ステータス）
CREATE INDEX CONCURRENTLY videos_user_status_idx
ON videos(user_id, status);

-- 期限切れ処理用（部分インデックス）
CREATE INDEX CONCURRENTLY reservations_hold_expires_idx
ON reservations(hold_expires_at)
WHERE status = 'hold';

-- 複合インデックス例
CREATE INDEX CONCURRENTLY videos_user_created_idx
ON videos(user_id, created_at DESC);
```

### 4.2 クエリ最適化

```typescript
// 悪い例: N+1問題
const reservations = await db.query.reservations.findMany();
for (const r of reservations) {
  const video = await db.query.videos.findFirst({ where: eq(videos.id, r.video_id) });
}

// 良い例: JOINで一括取得
const reservations = await db.query.reservations.findMany({
  with: {
    video: true,
    payment: true,
  },
});
```

### 4.3 コネクションプール

```typescript
// drizzle.config.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

// プール設定
const client = postgres(connectionString, {
  max: 10,  // 最大接続数
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client);
```

---

## 5. フロントエンド最適化

### 5.1 コード分割

```typescript
// 動的インポート
const VideoEditor = dynamic(() => import('@/components/video-editor'), {
  loading: () => <VideoEditorSkeleton />,
  ssr: false,  // クライアントのみ
});

// ルートベースの分割は Next.js が自動処理
```

### 5.2 画像最適化

```tsx
import Image from 'next/image';

// サムネイル表示
<Image
  src={thumbnailUrl}
  alt={title}
  width={320}
  height={180}
  placeholder="blur"
  blurDataURL={blurDataUrl}
  sizes="(max-width: 768px) 100vw, 320px"
/>
```

### 5.3 バンドルサイズ削減

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
};

// 必要な関数のみインポート
import { format, addDays } from 'date-fns';  // 全体インポートを避ける
```

---

## 6. API最適化

### 6.1 レスポンス圧縮

```typescript
// Next.js は自動で gzip/brotli 圧縮
// 明示的に設定する場合
const nextConfig = {
  compress: true,
};
```

### 6.2 ページネーション

```typescript
// カーソルベースページネーション
export async function getUserVideos(cursor?: number, limit = 10) {
  const videos = await db.query.videos.findMany({
    where: and(
      eq(videos.user_id, currentUser.id),
      cursor ? lt(videos.id, cursor) : undefined
    ),
    orderBy: desc(videos.created_at),
    limit: limit + 1,  // 次ページ判定用
  });

  const hasMore = videos.length > limit;
  const items = hasMore ? videos.slice(0, -1) : videos;
  const nextCursor = hasMore ? items[items.length - 1].id : undefined;

  return { items, nextCursor, hasMore };
}
```

### 6.3 部分レスポンス

```typescript
// 必要なフィールドのみ返す
export async function getVideoSummaries() {
  return await db.query.videos.findMany({
    columns: {
      id: true,
      status: true,
      video_url: true,
      created_at: true,
    },
    where: eq(videos.user_id, currentUser.id),
  });
}
```

---

## 7. モニタリング

### 7.1 パフォーマンス計測

```typescript
// lib/performance.ts
export function measureApiLatency(name: string) {
  const start = performance.now();

  return {
    end: () => {
      const duration = performance.now() - start;
      logger.info({ metric: 'api_latency', name, duration_ms: duration });

      // 閾値超過時はアラート
      if (duration > 2000) {
        logger.warn({ metric: 'slow_api', name, duration_ms: duration });
      }
    },
  };
}

// 使用例
export async function getTemplates() {
  const measure = measureApiLatency('getTemplates');
  try {
    return await db.query.templates.findMany();
  } finally {
    measure.end();
  }
}
```

### 7.2 Core Web Vitals 収集

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## 8. 負荷テスト

### 8.1 テストシナリオ

```typescript
// k6スクリプト例
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // 100ユーザーまで増加
    { duration: '5m', target: 100 },  // 維持
    { duration: '2m', target: 0 },    // 終了
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95%が500ms以内
    http_req_failed: ['rate<0.01'],    // エラー率1%未満
  },
};

export default function () {
  // テンプレート取得
  const res = http.get('https://api.example.com/templates');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

### 8.2 ボトルネック特定

- DB クエリの EXPLAIN ANALYZE
- APM ツールでのトレース分析
- メモリ/CPU プロファイリング
