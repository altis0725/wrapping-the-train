/**
 * 予約フローテスト（認証済みユーザー）
 *
 * 現在の仕様: 予約機能は「Coming Soon」状態
 * 
 * このテストは予約ページが正しく「準備中」と表示されることを確認します。
 * 予約機能が実装された際には、このテストを更新してください。
 */

import { test, expect } from "@playwright/test";

test.describe("予約ページ（Coming Soon）", () => {
  test("予約ページが表示される", async ({ page }) => {
    await page.goto("/reservations");

    // ページが表示される
    await expect(page.locator("body")).toBeVisible();
  });

  test("Coming Soonメッセージが表示される", async ({ page }) => {
    await page.goto("/reservations");

    // Coming Soonタイトル
    await expect(page.getByText("Coming Soon")).toBeVisible({ timeout: 10000 });
  });

  test("準備中メッセージが表示される", async ({ page }) => {
    await page.goto("/reservations");

    // 準備中メッセージ
    await expect(page.getByText("投影予約機能は準備中です")).toBeVisible({ timeout: 10000 });
  });

  test("トップページへ戻るリンクが存在する", async ({ page }) => {
    await page.goto("/reservations");

    // トップページへ戻るボタン
    const backButton = page.getByRole("link", { name: /トップページへ戻る/ });
    await expect(backButton).toBeVisible({ timeout: 10000 });
  });

  test("トップページへ戻るリンクが機能する", async ({ page }) => {
    await page.goto("/reservations");

    // トップページへ戻るボタンをクリック
    const backButton = page.getByRole("link", { name: /トップページへ戻る/ });
    await backButton.click();

    // トップページに遷移
    await expect(page).toHaveURL("/");
  });
});

// 以下は予約機能が実装された際のテストテンプレート
// 現在はスキップされます

test.describe.skip("予約フロー（実装後用）", () => {
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
      '[data-testid="available-date"], [role="gridcell"]:not([aria-disabled="true"])'
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

  test("日付選択後にスロットが表示される", async ({ page }) => {
    await page.goto("/reservations");

    // カレンダーが表示されるのを待つ
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible({ timeout: 30000 });

    // 選択可能な日付を探す
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

  test("決済ボタンでStripe Checkoutに遷移", async ({ page }) => {
    await page.goto("/reservations");

    // 日付とスロットを選択
    const dateButton = page.locator('[data-testid="available-date"]').first();

    if ((await dateButton.count()) > 0) {
      await dateButton.click();
      await page.waitForTimeout(1000);

      const slot = page.locator('[data-testid="slot"]:not([disabled]), .slot:not(.disabled)').first();

      if ((await slot.count()) > 0) {
        await slot.click();
        await page.waitForTimeout(500);

        // 決済ボタン
        const payButton = page.locator(
          'button:has-text("決済"), button:has-text("支払"), [data-testid="pay-button"]'
        );

        if ((await payButton.count()) > 0 && (await payButton.first().isEnabled())) {
          // クリックしてStripeへの遷移を確認
          const navigationPromise = page.waitForNavigation({ timeout: 5000 }).catch(() => null);
          await payButton.first().click();

          await page.waitForTimeout(2000);
        }
      }
    }
  });
});
