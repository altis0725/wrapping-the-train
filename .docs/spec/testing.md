# テスト戦略

## 概要

テストピラミッドに基づき、単体テスト・統合テスト・E2Eテストを適切な比率で実施。

```
       /\
      /E2E\        少量・重要フロー
     /------\
    /統合テスト\    中量・API境界
   /------------\
  /  単体テスト  \  多量・ビジネスロジック
 /----------------\
```

---

## 1. 単体テスト

### ツール

- **Vitest**: テストランナー
- **Testing Library**: コンポーネントテスト

### 対象

| 対象 | カバレッジ目標 | 例 |
|------|---------------|-----|
| ビジネスロジック | 90%+ | 料金計算、期限判定 |
| バリデーション | 100% | Zodスキーマ |
| ユーティリティ | 80%+ | 日付操作、フォーマット |

### テスト例

```typescript
// lib/services/__tests__/reservation.test.ts
import { describe, it, expect, vi } from 'vitest';
import { canCancel, getSlotStartTime } from '../reservation';

describe('canCancel', () => {
  it('48時間以上前はキャンセル可能', () => {
    const reservation = {
      projection_date: new Date('2025-02-01'),
      slot_number: 1,
    };
    vi.setSystemTime(new Date('2025-01-29T12:00:00+09:00'));

    expect(canCancel(reservation)).toBe(true);
  });

  it('48時間未満はキャンセル不可', () => {
    const reservation = {
      projection_date: new Date('2025-02-01'),
      slot_number: 1,
    };
    vi.setSystemTime(new Date('2025-01-31T12:00:00+09:00'));

    expect(canCancel(reservation)).toBe(false);
  });

  it('境界値: ちょうど48時間前', () => {
    const reservation = {
      projection_date: new Date('2025-02-01'),
      slot_number: 1, // 18:15開始
    };
    vi.setSystemTime(new Date('2025-01-30T18:15:00+09:00'));

    expect(canCancel(reservation)).toBe(true);
  });
});

describe('getSlotStartTime', () => {
  it('スロット1は18:15', () => {
    const result = getSlotStartTime(new Date('2025-02-01'), 1);
    expect(result.getHours()).toBe(18);
    expect(result.getMinutes()).toBe(15);
  });
});
```

### コンポーネントテスト

```typescript
// components/__tests__/slot-picker.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SlotPicker } from '../slot-picker';

describe('SlotPicker', () => {
  it('利用可能なスロットを表示', () => {
    const slots = [
      { slotNumber: 1, status: 'available' },
      { slotNumber: 2, status: 'reserved' },
    ];

    render(<SlotPicker slots={slots} onSelect={vi.fn()} />);

    expect(screen.getByText('18:15-18:30')).toBeEnabled();
    expect(screen.getByText('18:45-19:00')).toBeDisabled();
  });

  it('スロット選択時にonSelectが呼ばれる', () => {
    const onSelect = vi.fn();
    const slots = [{ slotNumber: 1, status: 'available' }];

    render(<SlotPicker slots={slots} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('18:15-18:30'));

    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
```

---

## 2. 統合テスト

### ツール

- **Vitest**: テストランナー
- **Supabase Local**: ローカルSupabase環境
- **MSW**: APIモック

### セットアップ

```typescript
// vitest.setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Server Actionsテスト

```typescript
// actions/__tests__/hold-slot.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { holdSlot } from '../reservations';
import { db, resetDatabase } from '@/test/db';
import { createTestUser, createTestVideo } from '@/test/factories';

describe('holdSlot', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('有効なリクエストで仮押さえ成功', async () => {
    const user = await createTestUser();
    const video = await createTestVideo({ userId: user.id });

    const result = await holdSlot({
      videoId: video.id,
      projectionDate: new Date('2025-02-01'),
      slotNumber: 1,
      idempotencyKey: 'test-key-1',
    });

    expect(result.reservationId).toBeDefined();
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('同一スロットの二重予約は失敗', async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const video1 = await createTestVideo({ userId: user1.id });
    const video2 = await createTestVideo({ userId: user2.id });

    await holdSlot({
      videoId: video1.id,
      projectionDate: new Date('2025-02-01'),
      slotNumber: 1,
      idempotencyKey: 'key-1',
    });

    await expect(
      holdSlot({
        videoId: video2.id,
        projectionDate: new Date('2025-02-01'),
        slotNumber: 1,
        idempotencyKey: 'key-2',
      })
    ).rejects.toThrow('SLOT_ALREADY_TAKEN');
  });

  it('冪等性: 同一キーで再リクエストは同じ結果', async () => {
    const user = await createTestUser();
    const video = await createTestVideo({ userId: user.id });

    const result1 = await holdSlot({
      videoId: video.id,
      projectionDate: new Date('2025-02-01'),
      slotNumber: 1,
      idempotencyKey: 'idempotent-key',
    });

    const result2 = await holdSlot({
      videoId: video.id,
      projectionDate: new Date('2025-02-01'),
      slotNumber: 1,
      idempotencyKey: 'idempotent-key',
    });

    expect(result1.reservationId).toBe(result2.reservationId);
  });
});
```

---

## 3. E2Eテスト

### ツール

- **Playwright**: ブラウザ自動化

### 対象フロー

| フロー | 優先度 | 理由 |
|--------|--------|------|
| 動画作成→予約→決済 | 最高 | コアビジネスフロー |
| ログイン→マイページ確認 | 高 | 認証フロー |
| 予約キャンセル | 高 | 重要な副フロー |
| 管理者: 投影完了 | 中 | 運用フロー |

### テスト例

```typescript
// e2e/reservation-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('予約フロー', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await page.goto('/');
    await page.click('text=ログイン');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('動画作成から予約完了まで', async ({ page }) => {
    // 動画作成
    await page.click('text=今すぐ始める');
    await expect(page).toHaveURL('/create');

    // テンプレート選択
    await page.click('[data-testid="template-1"]');
    await page.click('text=次へ');
    await page.click('[data-testid="template-2"]');
    await page.click('text=次へ');
    await page.click('[data-testid="template-3"]');
    await page.click('text=動画を作成');

    // 生成完了待ち
    await expect(page.locator('[data-testid="video-status"]')).toHaveText(
      'completed',
      { timeout: 120000 }
    );

    // 予約へ進む
    await page.click('text=投影を予約する');
    await expect(page).toHaveURL('/reservations');

    // スロット選択
    await page.click('[data-testid="slot-1"]');
    await page.click('text=予約する');

    // 仮押さえ確認
    await expect(page.locator('[data-testid="countdown"]')).toBeVisible();

    // 決済へ（Stripe Test Mode）
    await page.click('text=決済に進む');
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
  });

  test('予約キャンセル', async ({ page }) => {
    // 既存の予約があると仮定
    await page.goto('/mypage');
    await page.click('text=予約管理');

    await page.click('[data-testid="cancel-reservation"]');
    await page.click('text=キャンセルする');

    await expect(page.locator('[data-testid="reservation-status"]')).toHaveText(
      'キャンセル済み'
    );
  });
});
```

---

## 4. 競合シナリオテスト

### 目的

race-conditions.md で定義した競合シナリオを再現・検証。

### テスト例

```typescript
// tests/race-conditions.test.ts
import { describe, it, expect } from 'vitest';
import { holdSlot } from '@/actions/reservations';
import { cleanupExpiredHolds } from '@/jobs/cleanup';
import { handleCheckoutComplete } from '@/webhooks/stripe';

describe('競合シナリオ', () => {
  it('シナリオ1: 期限切れ後の決済Webhook', async () => {
    // 1. 仮押さえ作成
    const reservation = await holdSlot({
      videoId: 1,
      projectionDate: new Date('2025-02-01'),
      slotNumber: 1,
      idempotencyKey: 'test-key',
    });

    // 2. 期限切れ処理（時間を進める）
    vi.setSystemTime(Date.now() + 16 * 60 * 1000); // 16分後
    await cleanupExpiredHolds();

    // 3. 決済Webhook到着
    const mockSession = createMockStripeSession({
      metadata: { reservationId: String(reservation.reservationId) },
    });

    await handleCheckoutComplete(mockSession);

    // 4. 検証: 返金が実行される
    const refunds = await getRefunds();
    expect(refunds).toHaveLength(1);
    expect(refunds[0].payment_intent).toBe(mockSession.payment_intent);
  });

  it('シナリオ2: 同時スロット確保', async () => {
    const promises = [
      holdSlot({
        videoId: 1,
        projectionDate: new Date('2025-02-01'),
        slotNumber: 1,
        idempotencyKey: 'key-1',
      }),
      holdSlot({
        videoId: 2,
        projectionDate: new Date('2025-02-01'),
        slotNumber: 1,
        idempotencyKey: 'key-2',
      }),
    ];

    const results = await Promise.allSettled(promises);

    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });
});
```

---

## 5. CI/CD統合

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test:coverage

      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info

  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm test:integration

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 6. テストデータ管理

### ファクトリー関数

```typescript
// test/factories/user.ts
import { faker } from '@faker-js/faker';
import { db, users } from '@/db';

export async function createTestUser(overrides?: Partial<typeof users.$inferInsert>) {
  const [user] = await db.insert(users).values({
    supabase_uid: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'user',
    ...overrides,
  }).returning();

  return user;
}
```

### データベースリセット

```typescript
// test/db.ts
export async function resetDatabase() {
  await db.execute(sql`TRUNCATE users, videos, reservations, payments CASCADE`);
}
```
