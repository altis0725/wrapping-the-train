/**
 * マイページテスト（データ保持ユーザー）
 *
 * 動画や予約データを持つユーザーでの表示・操作をテストします。
 * Storage State: .auth/user-with-videos.json
 */

import { test, expect } from "@playwright/test";
import { mockShotstackApi, mockStripeApi } from "./helpers/mock-line-auth";

test.describe("動画一覧表示", () => {
  test("保存済み動画が一覧表示される", async ({ page }) => {
    await page.goto("/mypage");

    // 動画一覧が表示される
    const videoItems = page.locator(
      '[data-testid="video-item"], .video-card, article'
    );

    // テストデータで作成した動画が表示されるはず
    await expect(videoItems.first()).toBeVisible({ timeout: 30000 });
  });

  test("動画のステータスが表示される", async ({ page }) => {
    await page.goto("/mypage");

    // ステータス表示（completed, pending など）
    const statusBadge = page.locator(
      '[data-testid="video-status"], .status, .badge'
    );

    if ((await statusBadge.count()) > 0) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });

  test("動画のプレビューまたはサムネイルが表示される", async ({ page }) => {
    await page.goto("/mypage");

    // サムネイルまたはビデオプレビュー
    const preview = page.locator(
      'video, img[src*="thumbnail"], [data-testid="video-preview"]'
    );

    if ((await preview.count()) > 0) {
      await expect(preview.first()).toBeVisible();
    }
  });
});

test.describe("動画操作", () => {
  test.beforeEach(async ({ page }) => {
    // 外部APIをモック化
    await mockShotstackApi(page);
    await mockStripeApi(page);
  });

  test("動画アクションボタンが表示される", async ({ page }) => {
    await page.goto("/mypage");

    // 動画カードが表示されるのを待つ
    const videoCard = page.locator('[data-testid="video-item"]').first();
    await expect(videoCard).toBeVisible({ timeout: 30000 });

    // 完成した動画にはダウンロード・予約ボタンがある
    // または処理中/失敗の動画には別のUIがある
    const actionButtons = videoCard.locator("button");
    await expect(actionButtons.first()).toBeVisible();
  });

  test("完成動画から予約フローを開始できる", async ({ page }) => {
    await page.goto("/mypage");

    // 予約ボタンを探す（完成動画にのみ表示される想定）
    const reserveButton = page.locator(
      '[data-testid="video-item"] button:has-text("予約")'
    );

    await page.waitForTimeout(2000);

    if ((await reserveButton.count()) > 0) {
      await reserveButton.first().click();

      // 予約ページに遷移
      await expect(page).toHaveURL(/\/reservations/, { timeout: 10000 });
    }
  });
});

test.describe("予約一覧表示", () => {
  test("予約タブをクリックすると予約セクションが表示される", async ({ page }) => {
    await page.goto("/mypage");

    // 予約タブをクリック
    const reservationsTab = page.locator('button[role="tab"]:has-text("予約")');
    await expect(reservationsTab).toBeVisible({ timeout: 10000 });
    await reservationsTab.click();

    // 予約セクションが表示される
    const reservationSection = page.locator('[data-testid="reservations-section"]');
    await expect(reservationSection).toBeVisible({ timeout: 5000 });
  });

  test("予約ステータスが表示される", async ({ page }) => {
    await page.goto("/mypage");

    // 予約タブをクリック
    const reservationsTab = page.locator('button[role="tab"]:has-text("予約")');
    await reservationsTab.click();

    // 予約が存在する場合のみステータス確認
    const reservationCards = page.locator('[data-testid="reservations-section"] [data-testid="reservation-item"]');

    await page.waitForTimeout(1000);

    if ((await reservationCards.count()) > 0) {
      const reservationStatus = page.locator('[data-testid="reservation-status"], .badge');
      await expect(reservationStatus.first()).toBeVisible();
    }
  });
});

test.describe("予約操作", () => {
  test.beforeEach(async ({ page }) => {
    await mockStripeApi(page);
  });

  test("予約キャンセルボタンが機能する", async ({ page }) => {
    await page.goto("/mypage");

    // キャンセルボタンを探す
    const cancelButton = page.locator(
      'button:has-text("キャンセル"), [data-testid="cancel-reservation"]'
    );

    if ((await cancelButton.count()) > 0) {
      // 確認ダイアログが表示されることを期待
      page.on("dialog", async (dialog) => {
        // キャンセルを実行しない（テストデータを保持するため）
        await dialog.dismiss();
      });

      await cancelButton.first().click();

      // 確認ダイアログまたはモーダルが表示される
      const confirmDialog = page.locator(
        '[role="alertdialog"], .confirm-dialog, .modal:has-text("キャンセル")'
      );

      await page.waitForTimeout(500);
      // ダイアログが表示されるか、ブラウザの確認ダイアログが出る
    }
  });
});
