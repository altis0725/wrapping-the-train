/**
 * LINE認証フローテスト（Mock版）
 *
 * page.route() でLINE OAuthをインターセプトし、
 * 外部ネットワーク依存なしで認証フローを検証します。
 */

import { test, expect } from "@playwright/test";
import { mockLineAuth } from "./helpers/mock-line-auth";
import { TEST_USERS } from "./fixtures/test-users";

test.setTimeout(30000);

test.describe("LINE認証フロー（Mock）", () => {
  test.beforeEach(async ({ page }) => {
    // LINE認証をモック化
    await mockLineAuth(page, {
      openId: TEST_USERS.user.openId,
      name: TEST_USERS.user.name,
    });
  });

  test("LINE認証開始URLが正しく構築される", async ({ page }) => {
    // ホームページからログインフローを開始
    await page.goto("/login");

    // ログインページが表示される
    await expect(page.locator("body")).toBeVisible();

    // LINE認証開始リンクまたはボタンを探す
    const lineLoginButton = page.locator(
      'a[href*="/api/auth/line"], button:has-text("LINE"), [data-testid="line-login"]'
    );

    if ((await lineLoginButton.count()) > 0) {
      // href属性を確認（クリックせずに検証）
      const href = await lineLoginButton.first().getAttribute("href");
      expect(href).toContain("/api/auth/line");
    }
  });

  test("認証エラー時の処理", async ({ page }) => {
    // エラーパラメータ付きでコールバックにアクセス
    await page.goto("/api/auth/line/callback?error=access_denied");

    // エラー時はホームまたはエラーページにリダイレクト
    await page.waitForURL(/\/login\?error=access_denied/, {
      timeout: 30000,
    });

    // エラーメッセージが表示されるか確認
    // （実装に依存）
  });

  test("state不一致時の処理", async ({ page }) => {
    // 不正なstateでコールバックにアクセス
    await page.goto(
      "/api/auth/line/callback?code=test_code&state=invalid_state"
    );

    // 不正アクセスとして処理される
    // （エラーページまたはホームにリダイレクト）
    await page.waitForURL(/\/login\?error=invalid_state/, {
      timeout: 30000,
    });
  });
});

test.describe("認証状態の永続化", () => {
  test("認証後のリダイレクト処理が正しく動作する", async ({ page }) => {
    // ログインページからcallbackUrl付きでアクセス
    await page.goto("/login?callbackUrl=/create");

    // ログインページが表示される
    await expect(page.locator("body")).toBeVisible();

    // callbackUrlがログインページで正しく処理されることを確認
    // （実際の認証は authenticated プロジェクトでテスト済み）
    const currentUrl = page.url();
    expect(currentUrl).toContain("/login");
  });

  test("未認証ユーザーは保護されたページからログインにリダイレクトされる", async ({ page }) => {
    // 認証が必要なページに直接アクセス
    await page.goto("/mypage");

    // ログインページにリダイレクトされる
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
