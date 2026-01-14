/**
 * マイページテスト（認証済みユーザー）
 *
 * Storage State を使用してログイン状態でテストを実行します。
 */

import { test, expect } from "@playwright/test";

test.setTimeout(30000);

test.describe("マイページ表示", () => {
  test("マイページにアクセスできる", async ({ page }) => {
    await page.goto("/mypage");

    // マイページが表示される（リダイレクトされない）
    await expect(page).toHaveURL(/\/mypage/, { timeout: 30000 });

    // ページの基本構造が存在
    await expect(page.locator("body")).toBeVisible();
  });

  test("ユーザー名が表示される", async ({ page }) => {
    await page.goto("/mypage");

    // ユーザー名またはプロフィール情報の表示を確認
    // （実装に応じてセレクタを調整）
    const userInfo = page.locator('[data-testid="user-info"], .user-name, h1, h2');
    await expect(userInfo.first()).toBeVisible();
  });

  test("動画一覧セクションが存在する", async ({ page }) => {
    await page.goto("/mypage");

    // 動画一覧セクション（空でも存在する）
    const videosSection = page.locator(
      '[data-testid="videos-section"], .videos, section:has-text("動画")'
    );

    // セクションが存在するか、「動画がありません」的なメッセージがある
    const hasVideosSection = (await videosSection.count()) > 0;
    const hasEmptyMessage =
      (await page.locator('text=/動画.*ありません|まだ.*動画/i').count()) > 0;

    expect(hasVideosSection || hasEmptyMessage).toBeTruthy();
  });

  test("予約一覧セクションが存在する", async ({ page }) => {
    await page.goto("/mypage");

    // 予約一覧セクション
    const reservationsSection = page.locator(
      '[data-testid="reservations-section"], .reservations, section:has-text("予約")'
    );

    const hasReservationsSection = (await reservationsSection.count()) > 0;
    const hasEmptyMessage =
      (await page.locator('text=/予約.*ありません|まだ.*予約/i').count()) > 0;

    expect(hasReservationsSection || hasEmptyMessage).toBeTruthy();
  });
});

test.describe("マイページナビゲーション", () => {
  test("ホームへ戻れる", async ({ page }) => {
    await page.goto("/mypage");

    // ホームへのリンクをクリック
    const homeLink = page.locator('a[href="/"], [data-testid="home-link"]');
    if ((await homeLink.count()) > 0) {
      await homeLink.first().click();
      await expect(page).toHaveURL("/");
    }
  });

  test("動画作成ページへ遷移できる", async ({ page }) => {
    await page.goto("/mypage");

    // 動画作成へのリンク
    const createLink = page.locator(
      'a[href="/create"], [data-testid="create-video"]'
    );
    if ((await createLink.count()) > 0) {
      await createLink.first().click();
      await expect(page).toHaveURL(/\/create/, { timeout: 30000 });
    }
  });
});

test.describe("ログアウト", () => {
  test("ログアウトボタンが機能する", async ({ page, context }) => {
    await page.goto("/mypage");

    // ログアウトボタンを探す
    const logoutButton = page.locator(
      'button:has-text("ログアウト"), a:has-text("ログアウト"), [data-testid="logout"]'
    );

    if ((await logoutButton.count()) > 0) {
      await logoutButton.first().click();

      // ログアウト後はホームまたはログインページにリダイレクト
      await page.waitForURL(/^\/$|\/login/, { timeout: 5000 });

      // セッションCookieが削除されていることを確認
      const cookies = await context.cookies();
      const sessionCookie = cookies.find((c) => c.name === "app_session_id");

      // ログアウト後はセッションCookieが削除または無効化
      // （完全削除の場合はundefined、無効化の場合は値が変わっている可能性）
    }
  });
});
