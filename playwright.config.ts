import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright設定
 *
 * プロジェクト構成:
 * - unauthenticated: 未認証テスト (*.unauth.spec.ts)
 * - authenticated: 一般ユーザーテスト (*.auth.spec.ts)
 * - authenticated-with-data: データ保持ユーザーテスト (*.data.spec.ts)
 * - admin: 管理者テスト (*.admin.spec.ts)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["list"]],

  // globalSetup/Teardown
  globalSetup: require.resolve("./e2e/global-setup.ts"),
  globalTeardown: require.resolve("./e2e/global-teardown.ts"),

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // 未認証テスト
    {
      name: "unauthenticated",
      testMatch: /.*\.unauth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // 一般ユーザーテスト（基本ユーザー）
    {
      name: "authenticated",
      testMatch: /.*\.auth\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/user.json",
      },
    },

    // データ保持ユーザーテスト（動画・予約あり）
    {
      name: "authenticated-with-data",
      testMatch: /.*\.data\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/user-with-videos.json",
      },
    },

    // 管理者テスト
    {
      name: "admin",
      testMatch: /.*\.admin\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/admin.json",
      },
    },

    // 既存のテスト（互換性維持）
    {
      name: "chromium",
      testMatch: /^(?!.*\.(unauth|auth|data|admin)\.spec\.ts$).*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
