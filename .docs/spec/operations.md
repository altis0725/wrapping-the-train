# 運用・監視

## 1. ログ戦略

### 構造化ログ

JSON形式で出力し、ログ集約サービスで検索可能にする。

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    env: process.env.NODE_ENV,
    service: 'wrapping-the-train',
  },
});

// 使用例
logger.info({ userId, videoId, action: 'VIDEO_CREATED' }, 'Video created');
logger.error({ error, reservationId }, 'Reservation failed');
```

### ログレベル定義

| レベル | 用途 | 例 |
|-------|------|-----|
| error | 即時対応が必要なエラー | 決済失敗、レンダリング失敗 |
| warn | 注意が必要だが正常動作 | レート制限超過、期限切れ |
| info | 通常のビジネスイベント | 予約作成、決済完了 |
| debug | 開発時のデバッグ情報 | 詳細なリクエスト内容 |

### ログ項目

```typescript
interface LogEntry {
  // 基本情報
  timestamp: string;
  level: string;
  message: string;

  // リクエスト情報
  requestId?: string;
  userId?: number;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;

  // ビジネス情報
  action?: string;
  entity?: string;
  entityId?: number;

  // エラー情報
  error?: {
    name: string;
    message: string;
    stack?: string;
  };

  // パフォーマンス
  durationMs?: number;
}
```

### 機密情報のマスキング

```typescript
const SENSITIVE_FIELDS = ['password', 'token', 'stripe_secret', 'email'];

function maskSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
        return [key, '***REDACTED***'];
      }
      return [key, value];
    })
  );
}
```

---

## 2. メトリクス

### 主要KPI

| メトリクス | 説明 | アラート閾値 |
|-----------|------|-------------|
| 予約成功率 | 仮押さえ→決済完了の割合 | < 70% |
| レンダリング成功率 | pending→completed | < 95% |
| 決済成功率 | Checkout Session→支払い完了 | < 90% |
| 平均レンダリング時間 | pending→completed | > 5分 |
| APIレイテンシ (P99) | 全エンドポイント | > 2秒 |
| エラー率 | 5xx応答の割合 | > 1% |

### メトリクス収集

```typescript
// Railway環境ではPromSQL + Grafana推奨
import { Counter, Histogram } from 'prom-client';

// カウンター
const reservationCounter = new Counter({
  name: 'reservations_total',
  help: 'Total number of reservations',
  labelNames: ['status'],
});

// ヒストグラム
const renderDuration = new Histogram({
  name: 'video_render_duration_seconds',
  help: 'Video render duration',
  buckets: [30, 60, 120, 300, 600],
});

// 使用
reservationCounter.inc({ status: 'confirmed' });
renderDuration.observe(durationInSeconds);
```

### ダッシュボード構成

**概要パネル**:
- 本日の予約数
- 本日の売上
- アクティブなレンダリング数
- 直近1時間のエラー数

**詳細パネル**:
- 予約ファネル（仮押さえ→決済→投影完了）
- スロット稼働率
- レンダリングキュー状況
- API応答時間分布

---

## 3. アラート設定

### 重要度レベル

| レベル | 説明 | 通知先 | 対応時間 |
|--------|------|--------|---------|
| Critical | サービス停止 | PagerDuty + Slack | 即時 |
| High | 機能障害 | Slack #alerts | 1時間以内 |
| Medium | パフォーマンス低下 | Slack #monitoring | 4時間以内 |
| Low | 軽微な問題 | Slack #monitoring | 翌営業日 |

### アラート条件

```yaml
# Critical
- name: ServiceDown
  condition: uptime < 99%
  window: 5m
  severity: critical

- name: PaymentFailureSpike
  condition: payment_failure_rate > 20%
  window: 10m
  severity: critical

# High
- name: RenderFailure
  condition: render_failure_count > 5
  window: 1h
  severity: high

- name: HighLatency
  condition: api_latency_p99 > 5s
  window: 5m
  severity: high

# Medium
- name: QueueBacklog
  condition: render_queue_size > 10
  window: 15m
  severity: medium

- name: DiskUsage
  condition: disk_usage > 80%
  window: 1h
  severity: medium
```

### Slack通知フォーマット

```typescript
async function sendSlackAlert(alert: Alert) {
  const color = {
    critical: '#FF0000',
    high: '#FFA500',
    medium: '#FFFF00',
    low: '#00FF00',
  }[alert.severity];

  await slack.chat.postMessage({
    channel: '#alerts',
    attachments: [{
      color,
      title: `[${alert.severity.toUpperCase()}] ${alert.name}`,
      text: alert.message,
      fields: [
        { title: 'Environment', value: process.env.NODE_ENV, short: true },
        { title: 'Time', value: new Date().toISOString(), short: true },
      ],
    }],
  });
}
```

---

## 4. バックアップ・リカバリ

### データベースバックアップ

**Supabase自動バックアップ**:
- 頻度: 毎日（Pro Plan）
- 保持期間: 7日間
- Point-in-time recovery: 有効

**手動バックアップ（重要イベント前）**:
```bash
# pg_dump実行
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### 動画ファイルバックアップ

- Supabase Storageの冗長性に依存
- 有料動画は投影完了まで削除禁止

### リカバリ手順

**障害種別ごとの対応**:

| 障害 | 対応 | RTO | RPO |
|------|------|-----|-----|
| DB障害 | Supabaseリストア | 1時間 | 24時間 |
| アプリ障害 | Railway再デプロイ | 5分 | 0 |
| Stripe障害 | 待機（外部サービス） | - | - |
| Shotstack障害 | 再試行後返金 | 24時間 | - |

---

## 5. デプロイメント

### 環境

| 環境 | URL | 用途 |
|------|-----|------|
| Production | wrapping-the-train.up.railway.app | 本番 |
| Staging | staging.wrapping-the-train.up.railway.app | ステージング |
| Preview | pr-{number}.wrapping-the-train.up.railway.app | PRプレビュー |

### デプロイフロー

```
Push to main
    ↓
GitHub Actions: テスト実行
    ↓
[テスト成功?]
  - Yes → Railway自動デプロイ
  - No  → PRブロック
    ↓
ヘルスチェック
    ↓
[成功?]
  - Yes → デプロイ完了
  - No  → 自動ロールバック
```

### ヘルスチェック

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    stripe: await checkStripe(),
  };

  const healthy = Object.values(checks).every(c => c.status === 'ok');

  return Response.json(
    { status: healthy ? 'healthy' : 'unhealthy', checks },
    { status: healthy ? 200 : 503 }
  );
}

async function checkDatabase(): Promise<HealthCheck> {
  try {
    await db.execute(sql`SELECT 1`);
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
```

---

## 6. インシデント対応

### エスカレーションフロー

```
アラート発生
    ↓
自動対応可能か判断
    ↓
[自動対応可能?]
  - Yes → 自動対応実行 → 結果記録
  - No  → オンコール担当者に通知
    ↓
30分以内に応答なし → 次の担当者にエスカレーション
    ↓
1時間以内に解決なし → 全員に通知
```

### ポストモーテム

インシデント解決後、以下を記録:

```markdown
## インシデント報告

**日時**: YYYY-MM-DD HH:MM - HH:MM
**影響範囲**: 全ユーザー / 一部機能
**重要度**: Critical / High / Medium / Low

### 概要
[何が起きたか]

### タイムライン
- HH:MM - アラート発生
- HH:MM - 調査開始
- HH:MM - 原因特定
- HH:MM - 修正適用
- HH:MM - サービス復旧

### 根本原因
[なぜ起きたか]

### 対応内容
[何をしたか]

### 再発防止策
- [ ] 短期: [すぐやること]
- [ ] 中期: [計画的にやること]
- [ ] 長期: [根本的な改善]
```
