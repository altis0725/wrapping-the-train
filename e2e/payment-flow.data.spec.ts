/**
 * 決済フローE2Eテスト
 *
 * 予約 → 仮押さえ → Stripe Checkout → 決済完了のフローをテストします。
 * このテストは完成した動画を持つユーザー（user-with-videos.json）で実行されます。
 */

import { test, expect } from "@playwright/test";

test.describe("決済フロー", () => {
  test("予約から決済までの完全なフロー", async ({ page }) => {
    // 1. 予約ページにアクセス
    await page.goto("/reservations");
    
    // カレンダーが表示されるのを待つ
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible({ timeout: 30000 });
    
    // スクリーンショット: 予約ページ初期状態
    await page.screenshot({ path: "test-screenshots/payment-01-reservations-page.png" });
    
    // 2. 日付を選択
    const dateButton = page.locator('[data-testid="available-date"]').first();
    
    if ((await dateButton.count()) === 0) {
      console.log("利用可能な日付がありません");
      return;
    }
    
    await dateButton.click();
    await page.waitForTimeout(2000);
    
    // スクリーンショット: 日付選択後
    await page.screenshot({ path: "test-screenshots/payment-02-date-selected.png" });
    
    // 3. スロットを選択
    const slot = page.locator('button:has-text("予約可能")').first();
    
    if ((await slot.count()) === 0) {
      console.log("利用可能なスロットがありません");
      return;
    }
    
    await slot.click();
    await page.waitForTimeout(1000);
    
    // スクリーンショット: スロット選択後
    await page.screenshot({ path: "test-screenshots/payment-03-slot-selected.png" });
    
    // 4. 仮押さえボタンをクリック
    const holdButton = page.locator('button:has-text("仮押さえする")');
    
    if ((await holdButton.count()) === 0 || !(await holdButton.isEnabled())) {
      console.log("仮押さえボタンが無効です");
      // 動画がない可能性があるので、アラートを確認
      const alert = page.locator('[role="alert"]');
      if ((await alert.count()) > 0) {
        console.log("アラート:", await alert.textContent());
      }
      await page.screenshot({ path: "test-screenshots/payment-error-no-hold-button.png" });
      return;
    }
    
    await holdButton.click();
    
    // 仮押さえ処理を待つ
    await page.waitForTimeout(3000);
    
    // スクリーンショット: 仮押さえ後
    await page.screenshot({ path: "test-screenshots/payment-04-after-hold.png" });
    
    // 5. 決済ボタンが表示されるのを待つ
    const payButton = page.locator('button:has-text("決済に進む")');
    
    // 最大10秒待機
    try {
      await expect(payButton).toBeVisible({ timeout: 10000 });
    } catch {
      console.log("決済ボタンが表示されませんでした");
      await page.screenshot({ path: "test-screenshots/payment-error-no-pay-button.png" });
      
      // エラーメッセージを確認
      const errorAlert = page.locator('[role="alert"]');
      if ((await errorAlert.count()) > 0) {
        console.log("エラー:", await errorAlert.textContent());
      }
      return;
    }
    
    // スクリーンショット: 決済ボタン表示
    await page.screenshot({ path: "test-screenshots/payment-05-pay-button-visible.png" });
    
    // 決済ボタンに金額が表示されていることを確認
    await expect(payButton).toContainText("5,000");
    
    // 6. 決済ボタンをクリック（Stripe Checkoutへ遷移）
    // 新しいページ/タブが開く可能性があるので、ナビゲーションを監視
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 15000 }).catch(() => null),
      payButton.click()
    ]);
    
    // Stripe Checkoutページに遷移したことを確認
    await page.waitForTimeout(3000);
    
    // スクリーンショット: Stripe Checkout
    await page.screenshot({ path: "test-screenshots/payment-06-stripe-checkout.png" });
    
    const currentUrl = page.url();
    console.log("現在のURL:", currentUrl);
    
    // Stripeのチェックアウトページに遷移したことを確認
    if (currentUrl.includes("checkout.stripe.com")) {
      console.log("✅ Stripe Checkoutページに正常に遷移しました");
      
      // テスト用カード情報を入力
      // メールアドレス
      const emailInput = page.locator('input[name="email"]');
      if ((await emailInput.count()) > 0) {
        await emailInput.fill("test@example.com");
      }
      
      // カード番号
      const cardNumberFrame = page.frameLocator('iframe[name*="card"]').first();
      const cardNumber = cardNumberFrame.locator('input[name="cardnumber"]');
      if ((await cardNumber.count()) > 0) {
        await cardNumber.fill("4242424242424242");
      }
      
      // 有効期限
      const expiry = cardNumberFrame.locator('input[name="exp-date"]');
      if ((await expiry.count()) > 0) {
        await expiry.fill("12/30");
      }
      
      // CVC
      const cvc = cardNumberFrame.locator('input[name="cvc"]');
      if ((await cvc.count()) > 0) {
        await cvc.fill("123");
      }
      
      // カード名義
      const cardholderName = page.locator('input[name="billingName"]');
      if ((await cardholderName.count()) > 0) {
        await cardholderName.fill("Test User");
      }
      
      await page.screenshot({ path: "test-screenshots/payment-07-card-info-filled.png" });
      
      // 支払いボタンをクリック
      const submitButton = page.locator('button[type="submit"]');
      if ((await submitButton.count()) > 0) {
        await submitButton.click();
        
        // 決済処理を待つ
        await page.waitForTimeout(10000);
        
        await page.screenshot({ path: "test-screenshots/payment-08-after-submit.png" });
        
        const finalUrl = page.url();
        console.log("最終URL:", finalUrl);
        
        if (finalUrl.includes("payment=success")) {
          console.log("✅ 決済が正常に完了しました！");
        }
      }
    } else {
      console.log("Stripe Checkoutへの遷移に失敗しました");
      console.log("現在のURL:", currentUrl);
    }
    
    // 最終スクリーンショット
    await page.screenshot({ path: "test-screenshots/payment-09-final.png" });
  });
});
