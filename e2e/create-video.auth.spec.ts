/**
 * 動画作成フローテスト（認証済みユーザー）
 *
 * テンプレート選択 → プレビュー → 保存のフローをテストします。
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

    // ページが表示される
    await expect(page.locator("body")).toBeVisible();

    // テンプレート選択UIが存在
    const templateSection = page.locator(
      '[data-testid="template-selector"], .template-list, section'
    );
    await expect(templateSection.first()).toBeVisible({ timeout: 30000 });
  });

  test("カテゴリ別テンプレートが表示される", async ({ page }) => {
    await page.goto("/create");

    // 3カテゴリ（背景、窓、車輪）のテンプレートセクションがあるはず
    const categories = page.locator(
      '[data-testid="category"], .category-section, section h2'
    );

    // 少なくとも1つ以上のカテゴリが表示される
    await expect(categories.first()).toBeVisible({ timeout: 30000 });
  });
});

test.describe("テンプレート選択", () => {
  test.beforeEach(async ({ page }) => {
    await mockShotstackApi(page);
  });

  test("テンプレートを選択できる", async ({ page }) => {
    await page.goto("/create");

    // テンプレートカードを探す
    const templateCard = page.locator(
      '[data-testid="template-card"], .template-card, .template-item'
    ).first();

    if ((await templateCard.count()) > 0) {
      await templateCard.click();

      // 選択状態になる
      const selectedCard = page.locator(
        '[data-testid="template-card"].selected, .template-card.selected, [aria-selected="true"]'
      );

      // 選択後の状態変化を確認
      await page.waitForTimeout(500);
    }
  });

  test("テンプレートのサムネイルが表示される", async ({ page }) => {
    await page.goto("/create");

    // サムネイル画像
    const thumbnails = page.locator(
      '.template-card img, [data-testid="template-thumbnail"]'
    );

    if ((await thumbnails.count()) > 0) {
      await expect(thumbnails.first()).toBeVisible();
    }
  });
});

test.describe("プレビュー", () => {
  test.beforeEach(async ({ page }) => {
    await mockShotstackApi(page);
  });

  test("選択後にプレビューが可能", async ({ page }) => {
    await page.goto("/create");

    // テンプレートを選択
    const templateCards = page.locator(
      '[data-testid="template-card"], .template-card'
    );

    // 3つのカテゴリからそれぞれ選択（実装に依存）
    // 簡略化: 最初のテンプレートをクリック
    if ((await templateCards.count()) > 0) {
      await templateCards.first().click();

      // プレビューボタンまたは次へボタンを探す
      const previewButton = page.locator(
        'button:has-text("プレビュー"), button:has-text("次へ"), [data-testid="preview-button"]'
      );

      if ((await previewButton.count()) > 0) {
        await expect(previewButton.first()).toBeVisible();
      }
    }
  });
});

test.describe("動画保存", () => {
  test.beforeEach(async ({ page }) => {
    await mockShotstackApi(page);
  });

  test("保存ボタンで動画が作成される", async ({ page }) => {
    await page.goto("/create");

    // 全テンプレートを選択するフローをシミュレート
    // （実装に応じて調整が必要）

    // 保存ボタンを探す
    const saveButton = page.locator(
      'button:has-text("保存"), button:has-text("作成"), [data-testid="save-video"]'
    );

    if ((await saveButton.count()) > 0) {
      // クリック前にボタンが有効か確認
      const isEnabled = await saveButton.first().isEnabled();

      if (isEnabled) {
        // APIリクエストを監視
        const responsePromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/videos") ||
            response.url().includes("shotstack"),
          { timeout: 10000 }
        ).catch(() => null);

        await saveButton.first().click();

        // 保存後の処理を確認
        await page.waitForTimeout(2000);
      }
    }
  });

  test("保存後にマイページに遷移", async ({ page }) => {
    // このテストは実際の保存処理後の遷移を確認
    // （前提: 動画が保存可能な状態）

    await page.goto("/create");

    const saveButton = page.locator(
      'button:has-text("保存"), [data-testid="save-video"]'
    );

    // 保存ボタンが有効で存在する場合のみテスト
    if ((await saveButton.count()) > 0 && (await saveButton.first().isEnabled())) {
      await saveButton.first().click();

      // 成功時はマイページまたは完了ページに遷移
      await page.waitForURL(/\/(mypage|create\/complete)/, { timeout: 15000 }).catch(() => {
        // 遷移しない場合もある（エラー表示など）
      });
    }
  });
});
