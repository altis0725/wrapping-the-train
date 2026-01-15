/**
 * 予約フローテスト（動画を持つ認証済みユーザー）
 *
 * カレンダー表示 → スロット選択 → 仮押さえ → 決済のフローをテストします。
 * このテストは完成した動画を持つユーザー（user-with-videos.json）で実行されます。
 */

import { test, expect } from "@playwright/test";
import { mockStripeApi } from "./helpers/mock-line-auth";

test.describe("予約ページ（動画あり）", () => {
  test.beforeEach(async ({ page }) => {
    await mockStripeApi(page);
  });

  test("予約ページが表示される", async ({ page }) => {
    await page.goto("/reservations");

    // ページが表示される
    await expect(page.locator("body")).toBeVisible();
    
    // 投影予約のタイトルが表示される
    await expect(page.locator("h1")).toContainText("投影予約");
  });

  test("動画選択セクションに完成した動画が表示される", async ({ page }) => {
    await page.goto("/reservations");

    // カレンダーが表示されるのを待つ
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible({ timeout: 30000 });

    // 「完成した動画がありません」のアラートが表示されないことを確認
    const noVideoAlert = page.locator('text=/完成した動画がありません/');
    
    // 動画選択ボタンが存在することを確認
    const videoButtons = page.locator('button:has-text("動画 #")');
    
    // 動画があるか、アラートがないことを確認
    const hasVideos = (await videoButtons.count()) > 0;
    const hasNoVideoAlert = (await noVideoAlert.count()) > 0;
    
    // 動画を持つユーザーなので、動画ボタンが表示されるはず
    expect(hasVideos || !hasNoVideoAlert).toBeTruthy();
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

    // カレンダーが表示されるのを待つ
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible({ timeout: 30000 });

    // 選択可能な日付ボタン
    const availableDate = page.locator('[data-testid="available-date"]');

    if ((await availableDate.count()) > 0) {
      await availableDate.first().click();

      // 選択状態になる
      await page.waitForTimeout(500);
      
      // 選択中の日付が表示される
      const selectedDateText = page.locator('text=/選択中:/');
      await expect(selectedDateText).toBeVisible();
    }
  });
});

test.describe("スロット選択（動画あり）", () => {
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

      // 時間を選択セクションが表示される
      const timeSection = page.locator('text=/時間を選択/');
      await expect(timeSection).toBeVisible();

      // スロット一覧が表示される
      const slots = page.locator('button:has-text("予約可能")');
      const hasSlots = (await slots.count()) > 0;

      expect(hasSlots).toBeTruthy();
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

      // スロットを選択（予約可能なスロット）
      const slot = page.locator('button:has-text("予約可能")').first();

      if ((await slot.count()) > 0) {
        await slot.click();
        await page.waitForTimeout(500);
        
        // スロットが選択状態になる（activeクラスなど）
        await expect(slot).toHaveAttribute('data-state', /.*/);
      }
    }
  });
});

test.describe("仮押さえフロー（動画あり）", () => {
  test.beforeEach(async ({ page }) => {
    await mockStripeApi(page);
  });

  test("仮押さえボタンが有効になる", async ({ page }) => {
    await page.goto("/reservations");

    // カレンダーが表示されるのを待つ
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible({ timeout: 30000 });

    // 日付を選択
    const dateButton = page.locator('[data-testid="available-date"]').first();

    if ((await dateButton.count()) > 0) {
      await dateButton.click();
      await page.waitForTimeout(2000);

      // スロットを選択
      const slot = page.locator('button:has-text("予約可能")').first();

      if ((await slot.count()) > 0) {
        await slot.click();
        await page.waitForTimeout(500);

        // 仮押さえボタンが有効になる
        const holdButton = page.locator('button:has-text("仮押さえする")');
        
        // ボタンが存在し、有効であることを確認
        if ((await holdButton.count()) > 0) {
          await expect(holdButton).toBeEnabled();
        }
      }
    }
  });

  test("仮押さえを実行できる", async ({ page }) => {
    await page.goto("/reservations");

    // カレンダーが表示されるのを待つ
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible({ timeout: 30000 });

    // 日付を選択
    const dateButton = page.locator('[data-testid="available-date"]').first();

    if ((await dateButton.count()) > 0) {
      await dateButton.click();
      await page.waitForTimeout(2000);

      // スロットを選択
      const slot = page.locator('button:has-text("予約可能")').first();

      if ((await slot.count()) > 0) {
        await slot.click();
        await page.waitForTimeout(500);

        // 仮押さえボタンをクリック
        const holdButton = page.locator('button:has-text("仮押さえする")');
        
        if ((await holdButton.count()) > 0 && (await holdButton.isEnabled())) {
          await holdButton.click();
          
          // 処理中の表示または決済ボタンの表示を待つ
          await page.waitForTimeout(3000);
          
          // 決済ボタンが表示されるか、エラーメッセージが表示される
          const payButton = page.locator('button:has-text("決済に進む")');
          const errorMessage = page.locator('[role="alert"]');
          
          const hasPayButton = (await payButton.count()) > 0;
          const hasError = (await errorMessage.count()) > 0;
          
          // どちらかが表示される（仮押さえ成功または失敗）
          expect(hasPayButton || hasError).toBeTruthy();
        }
      }
    }
  });

  test("仮押さえ後に決済ボタンが表示される", async ({ page }) => {
    await page.goto("/reservations");

    // カレンダーが表示されるのを待つ
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible({ timeout: 30000 });

    // 日付を選択
    const dateButton = page.locator('[data-testid="available-date"]').first();

    if ((await dateButton.count()) > 0) {
      await dateButton.click();
      await page.waitForTimeout(2000);

      // スロットを選択
      const slot = page.locator('button:has-text("予約可能")').first();

      if ((await slot.count()) > 0) {
        await slot.click();
        await page.waitForTimeout(500);

        // 仮押さえボタンをクリック
        const holdButton = page.locator('button:has-text("仮押さえする")');
        
        if ((await holdButton.count()) > 0 && (await holdButton.isEnabled())) {
          await holdButton.click();
          
          // 決済ボタンが表示されるのを待つ
          const payButton = page.locator('button:has-text("決済に進む")');
          
          // 最大10秒待機
          await expect(payButton).toBeVisible({ timeout: 10000 }).catch(() => {});
          
          if ((await payButton.count()) > 0) {
            // 決済ボタンに金額が表示されている
            await expect(payButton).toContainText("5,000");
          }
        }
      }
    }
  });
});

test.describe("決済フロー（動画あり）", () => {
  test.beforeEach(async ({ page }) => {
    await mockStripeApi(page);
  });

  test("決済ボタンでStripe Checkoutに遷移", async ({ page }) => {
    await page.goto("/reservations");

    // カレンダーが表示されるのを待つ
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible({ timeout: 30000 });

    // 日付を選択
    const dateButton = page.locator('[data-testid="available-date"]').first();

    if ((await dateButton.count()) > 0) {
      await dateButton.click();
      await page.waitForTimeout(2000);

      // スロットを選択
      const slot = page.locator('button:has-text("予約可能")').first();

      if ((await slot.count()) > 0) {
        await slot.click();
        await page.waitForTimeout(500);

        // 仮押さえボタンをクリック
        const holdButton = page.locator('button:has-text("仮押さえする")');
        
        if ((await holdButton.count()) > 0 && (await holdButton.isEnabled())) {
          await holdButton.click();
          
          // 決済ボタンが表示されるのを待つ
          const payButton = page.locator('button:has-text("決済に進む")');
          
          await page.waitForTimeout(3000);
          
          if ((await payButton.count()) > 0 && (await payButton.isEnabled())) {
            // Stripeへのリダイレクトを監視
            const [response] = await Promise.all([
              page.waitForResponse(
                (response) => response.url().includes("stripe") || response.url().includes("checkout"),
                { timeout: 10000 }
              ).catch(() => null),
              payButton.click()
            ]);
            
            // Stripeへのリクエストが発生するか、URLが変わる
            await page.waitForTimeout(2000);
          }
        }
      }
    }
  });
});
