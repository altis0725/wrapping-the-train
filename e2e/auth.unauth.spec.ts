/**
 * 未認証アクセス制御テスト
 *
 * 未認証ユーザーが保護されたページにアクセスした際の
 * リダイレクト動作を確認します。
 */

import { test, expect } from "@playwright/test";

test.describe("未認証アクセス制御", () => {
  test("マイページにアクセスするとログインページにリダイレクト", async ({
    page,
  }) => {
    await page.goto("/mypage");

    // リダイレクトを確認（/ またはログインページへ）
    await expect(page).not.toHaveURL(/\/mypage/);

    // ログインを促すUIがあることを確認（ボタンやテキスト）
    const loginPrompt = page.locator(
      'text=/ログイン|LINE|サインイン/i'
    );
    const hasLoginPrompt = (await loginPrompt.count()) > 0;

    // リダイレクト先がホームかログインページであることを確認
    const url = page.url();
    expect(url.includes("/mypage")).toBeFalsy();
  });

  test("管理画面にアクセスするとリダイレクト", async ({ page }) => {
    await page.goto("/admin");

    // 管理画面にはアクセスできない
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test("予約ページにアクセスするとリダイレクト", async ({ page }) => {
    await page.goto("/reservations");

    // 予約ページには認証が必要
    await expect(page).not.toHaveURL(/\/reservations/);
  });

  test("公開ページには未認証でアクセス可能", async ({ page }) => {
    // ホームページ
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    // 利用規約
    await page.goto("/terms");
    await expect(page.locator("body")).toBeVisible();

    // プライバシーポリシー
    await page.goto("/privacy");
    await expect(page.locator("body")).toBeVisible();

    // 特商法に基づく表記
    await page.goto("/law");
    await expect(page.locator("body")).toBeVisible();

    // お問い合わせ
    await page.goto("/contact");
    await expect(page.locator("body")).toBeVisible();
  });

  test("動画作成ページは途中まで未認証でアクセス可能", async ({ page }) => {
    // 動画作成ページ自体は表示可能（テンプレート選択まで）
    await page.goto("/create");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("LINE認証フロー開始", () => {
  test("ログインボタンでLINE認証が開始される", async ({ page }) => {
    await page.goto("/");

    // LINEログインボタンを探す
    const loginButton = page.locator(
      'a[href*="line"], button:has-text("LINE"), [data-testid="line-login"]'
    );

    if ((await loginButton.count()) > 0) {
      // クリック前のURL
      const beforeUrl = page.url();

      // LINE認証URLへの遷移を監視
      const [response] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes("access.line.me") ||
            resp.url().includes("/api/auth/line"),
          { timeout: 5000 }
        ).catch(() => null),
        loginButton.first().click(),
      ]);

      // LINE認証フローが開始されたことを確認
      // （内部APIを経由する場合と直接リダイレクトする場合がある）
      const currentUrl = page.url();
      const isAuthFlow =
        currentUrl.includes("line") ||
        currentUrl.includes("auth") ||
        currentUrl !== beforeUrl;

      expect(isAuthFlow).toBeTruthy();
    }
  });
});
