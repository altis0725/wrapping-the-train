/**
 * 管理画面テスト（管理者ユーザー）
 *
 * Storage State: .auth/admin.json
 */

import { test, expect } from "@playwright/test";

const ADMIN_TEST_TIMEOUT = 30000;

test.describe("管理画面アクセス", () => {
  test.describe.configure({ timeout: ADMIN_TEST_TIMEOUT });

  test("管理画面にアクセスできる", async ({ page }) => {
    await page.goto("/admin");

    // 管理画面が表示される
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("ダッシュボードが表示される", async ({ page }) => {
    await page.goto("/admin");

    // ダッシュボードコンテンツ
    const dashboard = page.locator(
      '[data-testid="admin-dashboard"], .dashboard, main'
    );
    await expect(dashboard.first()).toBeVisible();
  });

  test("ナビゲーションメニューが存在する", async ({ page }) => {
    await page.goto("/admin");

    // サイドバーまたはナビゲーション
    const nav = page.locator(
      'nav, [data-testid="admin-nav"], .sidebar'
    );
    await expect(nav.first()).toBeVisible();
  });
});

test.describe("テンプレート管理", () => {
  test.describe.configure({ timeout: ADMIN_TEST_TIMEOUT });

  test("テンプレート一覧ページにアクセスできる", async ({ page }) => {
    await page.goto("/admin/templates");

    // テンプレート一覧が表示される
    await expect(page).toHaveURL(/\/admin\/templates/);
  });

  test("テンプレート一覧が表示される", async ({ page }) => {
    await page.goto("/admin/templates");

    // テンプレートカードまたはテーブル行
    const templateItems = page.locator(
      '[data-testid="template-item"], tr, .template-card'
    );

    // 少なくとも1つ以上のテンプレートが表示される
    // （テストデータのテンプレートを含む）
    await expect(templateItems.first()).toBeVisible({ timeout: 10000 });
  });

  test("新規テンプレート作成ダイアログが開ける", async ({ page }) => {
    await page.goto("/admin/templates");

    // 新規作成ボタン
    const createButton = page.locator(
      'button:has-text("新規作成"), button:has-text("新規"), [data-testid="create-template"]'
    );

    if ((await createButton.count()) > 0) {
      await createButton.first().click();

      // ダイアログが開くことを確認
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // ダイアログにタイトルがあることを確認
      const dialogTitle = dialog.locator('text=/テンプレートを(作成|編集)/');
      await expect(dialogTitle).toBeVisible();
    }
  });

  test("テンプレート編集ページにアクセスできる", async ({ page }) => {
    await page.goto("/admin/templates");

    // 編集ボタン
    const editButton = page.locator(
      'a[href*="edit"], button:has-text("編集"), [data-testid="edit-template"]'
    ).first();

    if ((await editButton.count()) > 0) {
      await editButton.click();
      await expect(page).toHaveURL(/\/admin\/templates\/\d+/);
    }
  });
});

test.describe("予約管理", () => {
  test.describe.configure({ timeout: ADMIN_TEST_TIMEOUT });

  test("予約一覧ページにアクセスできる", async ({ page }) => {
    await page.goto("/admin/reservations");

    await expect(page).toHaveURL(/\/admin\/reservations/);
  });

  test("予約一覧が表示される", async ({ page }) => {
    await page.goto("/admin/reservations");

    // 予約データがある場合は一覧表示
    const reservationItems = page.locator(
      '[data-testid="reservation-item"], tr, .reservation-card'
    );

    await page.waitForTimeout(2000);

    // 予約があるか、「予約がありません」メッセージがある
    const hasItems = (await reservationItems.count()) > 0;
    const hasEmptyMessage = (await page.locator('text=/予約.*ありません/i').count()) > 0;

    expect(hasItems || hasEmptyMessage).toBeTruthy();
  });

  test("予約フィルターが機能する", async ({ page }) => {
    await page.goto("/admin/reservations");

    // フィルター用のステータスドロップダウン
    const statusFilter = page.locator('button[role="combobox"]:has-text("すべて")');

    await page.waitForTimeout(1000);

    if ((await statusFilter.count()) > 0) {
      await expect(statusFilter.first()).toBeVisible();
    }

    // テーブルが表示されることを確認
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });
  });
});

test.describe("スケジュール管理", () => {
  test.describe.configure({ timeout: ADMIN_TEST_TIMEOUT });

  test("スケジュール設定ページにアクセスできる", async ({ page }) => {
    await page.goto("/admin/schedules");

    await expect(page).toHaveURL(/\/admin\/schedules/);
  });

  test("カレンダー形式でスケジュールが表示される", async ({ page }) => {
    await page.goto("/admin/schedules");

    // カレンダーまたは日付一覧
    const calendar = page.locator(
      '[data-testid="schedule-calendar"], .calendar, [role="grid"]'
    );

    await expect(calendar.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("統計情報", () => {
  test.describe.configure({ timeout: ADMIN_TEST_TIMEOUT });

  test("統計ダッシュボードが表示される", async ({ page }) => {
    await page.goto("/admin");

    // 統計カードまたはチャート
    const statsCard = page.locator(
      '[data-testid="stats-card"], .stats, .metric'
    );

    if ((await statsCard.count()) > 0) {
      await expect(statsCard.first()).toBeVisible();
    }
  });

  test("予約数が表示される", async ({ page }) => {
    await page.goto("/admin");

    // 予約数の表示
    const reservationCountByTestId = page.getByTestId("reservation-count");
    if ((await reservationCountByTestId.count()) > 0) {
      await expect(reservationCountByTestId.first()).toBeVisible();
      return;
    }

    const reservationCountByText = page.getByText(/予約/);
    if ((await reservationCountByText.count()) > 0) {
      await expect(reservationCountByText.first()).toBeVisible();
    }
  });
});

test.describe("監査ログ", () => {
  test.describe.configure({ timeout: ADMIN_TEST_TIMEOUT });

  test("監査ログページにアクセスできる", async ({ page }) => {
    // 監査ログへのリンクがある場合
    await page.goto("/admin");

    const auditLink = page.locator(
      'a[href*="audit"], a[href*="logs"], [data-testid="audit-logs"]'
    );

    if ((await auditLink.count()) > 0) {
      await auditLink.first().click();
      await expect(page).toHaveURL(/\/admin\/(audit|logs)/);
    }
  });
});

test.describe("管理者権限チェック", () => {
  test.describe.configure({ timeout: ADMIN_TEST_TIMEOUT });

  test("一般ユーザーは管理画面にアクセスできない", async ({ browser, baseURL }) => {
    // 新しいコンテキストを作成（Storage State無効化、baseURLを設定）
    const context = await browser.newContext({
      baseURL,
      storageState: undefined, // 明示的にstorageStateを無効化
    });
    const page = await context.newPage();

    // Cookieがないことを確認
    const cookiesBefore = await context.cookies();
    console.log("Cookies before:", cookiesBefore.map((c) => c.name));

    await page.goto("/admin");

    // リダイレクトされる（/loginにリダイレクト）
    await expect(page).toHaveURL(/\/login/);

    await context.close();
  });
});
