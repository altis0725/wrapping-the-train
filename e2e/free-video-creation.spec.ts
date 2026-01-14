/**
 * 無料動画作成フローのE2Eテスト
 * Cookie設定から動画作成までをテスト
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SESSION_COOKIE = {
  name: 'app_session_id',
  value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuSWQiOiJkZXZfdXNlcl8wMDEiLCJuYW1lIjoiRGV2IFVzZXIiLCJpYXQiOjE3NjgzOTY5MjUsImV4cCI6MTc3MDk4ODkyNX0.9K0I1zb2Il7O827CmOZkEvUJOVnYF-1xRw14xN1EsZA',
  domain: 'localhost',
  path: '/',
};

const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots');
const BASE_URL = 'http://localhost:3000';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Free Video Creation Flow', () => {
  test('should complete the full video creation flow', async ({ page, context }) => {
    test.setTimeout(300000); // 5 minutes timeout

    // Capture console messages and errors
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error));

    // Step 1: Set session cookie
    console.log('1️⃣  Setting session cookie...');
    await context.addCookies([SESSION_COOKIE]);
    console.log('✅ Cookie set\n');

    // Step 2: Navigate to /create
    console.log('2️⃣  Navigating to /create page...');
    await page.goto(`${BASE_URL}/create`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-02-create-page-loaded.png'),
      fullPage: true
    });
    console.log('✅ Page loaded\n');

    // Verify we're on the create page
    await expect(page).toHaveURL(/\/create/);

    // Step 3: Select first template in Step 1 (背景)
    console.log('3️⃣  Selecting first background template...');
    await page.waitForTimeout(1000);

    // Find the first template card using data-testid
    const step1Cards = page.locator('[data-testid="template-card"]');
    await step1Cards.first().waitFor({ state: 'visible' });

    // Count available cards
    const cardCount = await step1Cards.count();
    console.log(`   Found ${cardCount} templates on current page`);

    await step1Cards.first().click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-03-background-selected.png'),
      fullPage: true
    });
    console.log('✅ Background selected\n');

    // Click "次へ" button
    console.log('4️⃣  Clicking "次へ" button...');
    const nextButton1 = page.getByRole('button', { name: '次へ' });
    await nextButton1.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-04-step2-window.png'),
      fullPage: true
    });
    console.log('✅ Moved to Step 2\n');

    // Step 4: Select first template in Step 2 (窓)
    console.log('5️⃣  Selecting first window template...');
    const step2Cards = page.locator('[data-testid="template-card"]');
    await step2Cards.first().waitFor({ state: 'visible' });
    await step2Cards.first().click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-05-window-selected.png'),
      fullPage: true
    });
    console.log('✅ Window selected\n');

    // Click "次へ" button
    console.log('6️⃣  Clicking "次へ" button...');
    const nextButton2 = page.getByRole('button', { name: '次へ' });
    await nextButton2.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-06-step3-wheel.png'),
      fullPage: true
    });
    console.log('✅ Moved to Step 3\n');

    // Step 5: Select first template in Step 3 (車輪)
    console.log('7️⃣  Selecting first wheel template...');
    const step3Cards = page.locator('[data-testid="template-card"]');
    await step3Cards.first().waitFor({ state: 'visible' });
    await step3Cards.first().click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-07-wheel-selected.png'),
      fullPage: true
    });
    console.log('✅ Wheel selected\n');

    // Step 6: Click "動画を作成" button
    console.log('8️⃣  Clicking "動画を作成" button...');
    const createButton = page.getByRole('button', { name: '動画を作成' });
    await createButton.click();
    await page.waitForTimeout(2000);

    // Check for error messages
    const errorMessages = await page.locator('.text-destructive, [role="alert"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('⚠️  Error messages detected:', errorMessages);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-08-video-creation-started.png'),
      fullPage: true
    });
    console.log('✅ Video creation started\n');

    // Step 7: Wait for video generation (check for loading state or redirect)
    console.log('9️⃣  Waiting for video generation...');
    console.log('   (This may take up to 3 minutes)\n');

    let attempts = 0;
    const maxAttempts = 36; // 3 minutes (5 seconds * 36)
    let videoCompleted = false;

    while (attempts < maxAttempts && !videoCompleted) {
      attempts++;
      await page.waitForTimeout(5000); // Check every 5 seconds

      const currentUrl = page.url();
      console.log(`   Attempt ${attempts}/${maxAttempts} - URL: ${currentUrl}`);

      // Check if redirected to mypage
      if (currentUrl.includes('/mypage')) {
        videoCompleted = true;
        console.log('✅ Redirected to mypage - video completed\n');
        break;
      }

      // Check for loading indicators
      const hasLoading = await page.locator('[data-loading="true"], [role="status"], .animate-spin').count() > 0;

      // Check for success/completion messages
      const hasSuccess = await page.getByText(/完成|完了|成功/i).count() > 0;

      if (hasSuccess && !hasLoading) {
        videoCompleted = true;
        console.log('✅ Success indicator found\n');
        break;
      }

      // Take periodic screenshots
      if (attempts % 6 === 0) { // Every 30 seconds
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `09-09-waiting-${Math.floor(attempts / 6)}.png`),
          fullPage: true
        });
      }
    }

    // Step 8: Final screenshot
    console.log('🔟 Taking final screenshot...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-10-final-state.png'),
      fullPage: true
    });

    if (videoCompleted) {
      console.log('\n✅ ✅ ✅ TEST COMPLETED SUCCESSFULLY ✅ ✅ ✅');
    } else {
      console.log('\n⚠️  TEST TIMEOUT - Video may still be processing');
      console.log('   Please check the screenshots and application state manually');
    }

    // Assert that we either completed or are still processing
    expect(videoCompleted || attempts < maxAttempts).toBeTruthy();
  });
});
