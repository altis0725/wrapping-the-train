import { test, expect } from "@playwright/test";

test.describe("ホームページ", () => {
  test("トップページが表示される", async ({ page }) => {
    await page.goto("/");

    // タイトルまたはメインコンテンツが存在することを確認
    await expect(page.locator("body")).toBeVisible();
  });

  test("ナビゲーションリンクが機能する", async ({ page }) => {
    await page.goto("/");

    // 動画作成ページへのリンクがあれば確認
    const createLink = page.locator('a[href="/create"]');
    if (await createLink.count() > 0) {
      await createLink.first().click();
      await expect(page).toHaveURL(/.*create/);
    }
  });
});

test.describe("認証フロー", () => {
  test("未認証ユーザーはマイページにアクセスできない", async ({ page }) => {
    await page.goto("/mypage");

    // リダイレクトまたは認証エラーを確認
    // LINE認証にリダイレクトされるか、ホームに戻るかを期待
    await expect(page).not.toHaveURL("/mypage");
  });
});
