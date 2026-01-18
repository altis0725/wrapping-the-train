/**
 * 動画作成フローテスト（認証済みユーザー）
 *
 * 新仕様: 60秒動画（背景6個 + 窓1個 + 車輪1個 + 音楽1個）
 * 
 * ステップ:
 * 1. 背景テンプレート6個を選択
 * 2. 窓テンプレート1個を選択
 * 3. 車輪テンプレート1個を選択
 * 4. 音楽テンプレート1個を選択
 * 5. 動画を作成
 */

import { test, expect } from "@playwright/test";
import { mockShotstackApi } from "./helpers/mock-line-auth";

test.describe("動画作成ページ", () => {
  test.beforeEach(async ({ page }) => {
    // Shotstack APIをモック化
    await mockShotstackApi(page);
  });

  test("動画作成ページが表示される", async ({ page }) => {
    await page.goto("/create");

    // ページタイトルが表示される
    await expect(page.getByRole("heading", { name: /CREATE VIDEO/i })).toBeVisible({ timeout: 30000 });
  });

  test("4つのステップが表示される", async ({ page }) => {
    await page.goto("/create");

    // ステップ: 背景、窓、車輪、音楽
    await expect(page.getByText("背景")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("窓")).toBeVisible();
    await expect(page.getByText("車輪")).toBeVisible();
    await expect(page.getByText("音楽")).toBeVisible();
  });
});

test.describe("背景選択（ステップ1）", () => {
  test.beforeEach(async ({ page }) => {
    await mockShotstackApi(page);
  });

  test("背景選択UIが表示される", async ({ page }) => {
    await page.goto("/create");

    // 背景選択UIが表示される
    await expect(page.getByText("背景を6つ選択")).toBeVisible({ timeout: 30000 });
  });

  test("6つの背景スロットが表示される", async ({ page }) => {
    await page.goto("/create");

    // 「0 / 6」カウンターが表示される
    await expect(page.getByText("0 / 6")).toBeVisible({ timeout: 30000 });
  });

  test("背景スロットをクリックするとテンプレート一覧が表示される", async ({ page }) => {
    await page.goto("/create");

    // 最初のスロットをクリック
    const slot = page.locator('[role="button"][aria-label^="背景1"]').first();
    await slot.waitFor({ state: "visible", timeout: 30000 });
    await slot.click();

    // テンプレート一覧が表示される
    await expect(page.getByText("背景 1 を選択")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("ステップ遷移", () => {
  test.beforeEach(async ({ page }) => {
    await mockShotstackApi(page);
  });

  test("背景6個選択後に次へボタンが有効になる", async ({ page }) => {
    await page.goto("/create");

    // 初期状態では次へボタンは無効
    const nextButton = page.getByRole("button", { name: /次へ/i });
    await expect(nextButton).toBeDisabled({ timeout: 30000 });

    // 背景スロットをクリックしてテンプレートを選択
    for (let i = 0; i < 6; i++) {
      const slot = page.locator(`[role="button"][aria-label^="背景${i + 1}"]`).first();
      await slot.click();
      await page.waitForTimeout(300);
      
      // テンプレート一覧から最初のテンプレートを選択
      const templateOption = page.locator('[role="button"][aria-pressed]').filter({ hasText: /テスト背景/i }).first();
      if (await templateOption.count() > 0) {
        await templateOption.click();
      }
      await page.waitForTimeout(300);
    }

    // 6個選択後は次へボタンが有効になる
    await expect(nextButton).toBeEnabled({ timeout: 10000 });
  });
});

test.describe("プレビュー", () => {
  test.beforeEach(async ({ page }) => {
    await mockShotstackApi(page);
  });

  test("プレビュー領域が存在する", async ({ page }) => {
    await page.goto("/create");

    // プレビュー領域が存在
    const preview = page.locator('[data-testid="video-preview"], .video-preview, [aria-label*="プレビュー"]');
    await expect(preview.first()).toBeVisible({ timeout: 30000 });
  });
});
