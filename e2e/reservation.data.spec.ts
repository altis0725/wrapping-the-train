/**
 * 予約フローテスト（動画を持つ認証済みユーザー）
 *
 * 現在の仕様: 予約機能は「Coming Soon」状態
 * 
 * このテストは予約ページが正しく「準備中」と表示されることを確認します。
 * 予約機能が実装された際には、このテストを更新してください。
 */

import { test, expect } from "@playwright/test";

test.describe("予約ページ（動画あり・Coming Soon）", () => {
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
});

// 以下は予約機能が実装された際のテストテンプレート
// 現在はスキップされます

test.describe.skip("予約ページ（動画あり・実装後用）", () => {
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

test.describe.skip("スロット選択（動画あり・実装後用）", () => {
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

test.describe.skip("仮押さえフロー（動画あり・実装後用）", () => {
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
});

test.describe.skip("決済フロー（動画あり・実装後用）", () => {
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
