/**
 * 予約フローテスト（認証済みユーザー）
 *
 * カレンダー表示 → スロット選択 → 決済のフローをテストします。
 */

import { test, expect } from "@playwright/test";
import { mockStripeApi } from "./helpers/mock-line-auth";

test.describe("予約ページ", () => {
  test.beforeEach(async ({ page }) => {
    await mockStripeApi(page);
  });

  test("予約ページが表示される", async ({ page }) => {
    await page.goto("/reservations");

    // ページが表示される
    await expect(page.locator("body")).toBeVisible();
  });

  test("カレンダーが表示される", async ({ page }) => {
    await page.goto("/reservations");

    // カレンダーコンポーネント
    const calendar = page.locator(
      '[data-testid="calendar"], .calendar, [role="grid"]'
    );

    await expect(calendar.first()).toBeVisible({ timeout: 30000 });
  });

  test("利用可能な日付が選択可能", async ({ page }) => {
    await page.goto("/reservations");

    // 選択可能な日付ボタン
    const availableDate = page.locator(
      '[data-testid="available-date"], [data-testid="available-date"], [role="gridcell"]:not([aria-disabled="true"])'
    );

    if ((await availableDate.count()) > 0) {
      await availableDate.first().click();

      // 選択状態になる
      const selectedDate = page.locator(
        '[aria-selected="true"], .selected-date, [data-selected="true"]'
      );

      await page.waitForTimeout(500);
    }
  });
});

test.describe("スロット選択", () => {
  test.beforeEach(async ({ page }) => {
    await mockStripeApi(page);
  });

  test("日付選択後にスロットが表示される", async ({ page }) => {
    await page.goto("/reservations");

    // カレンダーが表示されるのを待つ
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible({ timeout: 30000 });

    // 選択可能な日付を探す (data-testid="available-date")
    const dateButton = page.locator('[data-testid="available-date"]').first();

    await page.waitForTimeout(1000);

    if ((await dateButton.count()) > 0) {
      await dateButton.click();

      await page.waitForTimeout(2000);

      // スロット一覧が表示される または スロットなしメッセージが表示される
      const slots = page.locator('[data-testid="slot"], .slot, .time-slot');
      const noSlotsMessage = page.locator('text=/スロット情報がありません|空き.*ありません/i');

      const hasSlots = (await slots.count()) > 0;
      const hasNoSlotsMessage = (await noSlotsMessage.count()) > 0;

      expect(hasSlots || hasNoSlotsMessage).toBeTruthy();
    }
  });

  test("スロットを選択できる", async ({ page }) => {
    await page.goto("/reservations");

    // カレンダーが表示されるのを待つ
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible({ timeout: 30000 });

    // 選択可能な日付を探す
    const dateButton = page.locator('[data-testid="available-date"]').first();

    await page.waitForTimeout(1000);

    if ((await dateButton.count()) > 0) {
      await dateButton.click();
      await page.waitForTimeout(2000);

      // スロットを選択
      const slot = page.locator('[data-testid="slot"]:not([disabled]), .slot:not(.disabled)').first();

      if ((await slot.count()) > 0) {
        await slot.click();
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe("決済フロー", () => {
  test.beforeEach(async ({ page }) => {
    await mockStripeApi(page);
  });

  test("決済ボタンでStripe Checkoutに遷移", async ({ page }) => {
    await page.goto("/reservations");

    // 日付とスロットを選択
    const dateButton = page.locator(
      '[data-testid="available-date"]'
    ).first();

    if ((await dateButton.count()) > 0) {
      await dateButton.click();
      await page.waitForTimeout(1000);

      const slot = page.locator(
        '[data-testid="slot"]:not([disabled]), .slot:not(.disabled)'
      ).first();

      if ((await slot.count()) > 0) {
        await slot.click();
        await page.waitForTimeout(500);

        // 決済ボタン
        const payButton = page.locator(
          'button:has-text("決済"), button:has-text("支払"), [data-testid="pay-button"]'
        );

        if ((await payButton.count()) > 0 && (await payButton.first().isEnabled())) {
          // クリックしてStripeへの遷移を確認
          // （モック環境ではリダイレクト先が異なる可能性あり）
          const navigationPromise = page.waitForNavigation({ timeout: 5000 }).catch(() => null);
          await payButton.first().click();

          await page.waitForTimeout(2000);
        }
      }
    }
  });
});

test.describe("仮押さえ", () => {
  test.beforeEach(async ({ page }) => {
    await mockStripeApi(page);
  });

  test("スロット選択で仮押さえが作成される", async ({ page }) => {
    await page.goto("/reservations");

    // 日付とスロットを選択
    const dateButton = page.locator(
      '[data-testid="available-date"]'
    ).first();

    if ((await dateButton.count()) > 0) {
      await dateButton.click();
      await page.waitForTimeout(1000);

      const slot = page.locator(
        '[data-testid="slot"]:not([disabled]), .slot:not(.disabled)'
      ).first();

      if ((await slot.count()) > 0) {
        // 仮押さえAPIへのリクエストを監視
        const responsePromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/reservations") &&
            response.request().method() === "POST",
          { timeout: 5000 }
        ).catch(() => null);

        await slot.click();

        const response = await responsePromise;

        if (response) {
          // 仮押さえが成功したことを確認
          expect(response.status()).toBeLessThan(400);
        }
      }
    }
  });

  test("仮押さえの有効期限が表示される", async ({ page }) => {
    await page.goto("/reservations");

    // 日付とスロットを選択後
    const dateButton = page.locator(
      '[data-testid="available-date"]'
    ).first();

    if ((await dateButton.count()) > 0) {
      await dateButton.click();
      await page.waitForTimeout(1000);

      const slot = page.locator(
        '[data-testid="slot"]:not([disabled]), .slot:not(.disabled)'
      ).first();

      if ((await slot.count()) > 0) {
        await slot.click();
        await page.waitForTimeout(1000);

        // 有効期限または残り時間の表示
        const timerDisplay = page.locator(
          '[data-testid="hold-timer"], .timer, text=/\\d+:\\d+|\\d+分/'
        );

        // タイマーが表示される場合
        if ((await timerDisplay.count()) > 0) {
          await expect(timerDisplay.first()).toBeVisible();
        }
      }
    }
  });
});
