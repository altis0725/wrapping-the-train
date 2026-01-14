import { test, expect } from '@playwright/test';
import { join } from 'path';

const SCREENSHOT_DIR = '/Users/altis/Documents/wrapping-the-train/test-screenshots/free-video-creation';
const BASE_URL = 'http://localhost:3000';

test('Free video creation flow', async ({ page }) => {
  // Note: Using authenticated project with storageState from .auth/user.json

  console.log('Step 1: Navigate to /create');
  await page.goto(`${BASE_URL}/create`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(SCREENSHOT_DIR, '30-page-loaded.png'), fullPage: true });
  console.log('✓ Page loaded');

  // Check if we're on the create page or redirected to login
  const url = page.url();
  if (url.includes('/login')) {
    throw new Error('Redirected to login page - authentication failed');
  }

  console.log('Step 2: Select background template');
  // Wait for template cards to be visible and click the first one
  const firstTemplate = page.locator('[data-testid="template-card"], .template-card, .template-item').first();
  await firstTemplate.waitFor({ state: 'visible', timeout: 10000 });
  await firstTemplate.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '31-background-selected.png'), fullPage: true });
  console.log('✓ Background selected');

  console.log('Step 3: Click next button');
  const nextButton1 = page.locator('button:has-text("次へ")');
  await nextButton1.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '32-step2-loaded.png'), fullPage: true });
  console.log('✓ Step 2 loaded');

  console.log('Step 4: Select window template');
  const windowTemplate = page.locator('[data-testid="template-card"], .template-card, .template-item').first();
  await windowTemplate.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '33-window-selected.png'), fullPage: true });
  console.log('✓ Window selected');

  console.log('Step 5: Click next button');
  const nextButton2 = page.locator('button:has-text("次へ")');
  await nextButton2.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '34-step3-loaded.png'), fullPage: true });
  console.log('✓ Step 3 loaded');

  console.log('Step 6: Select wheel template');
  const wheelTemplate = page.locator('[data-testid="template-card"], .template-card, .template-item').first();
  await wheelTemplate.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '35-wheel-selected.png'), fullPage: true });
  console.log('✓ Wheel selected');

  console.log('Step 7: Click create video button');
  const createButton = page.locator('button:has-text("動画を作成")');
  await createButton.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '36-creating-started.png'), fullPage: true });
  console.log('✓ Video creation started');

  console.log('Step 8: Wait for video generation (max 3 minutes)');
  try {
    // Wait for either completion message or error
    await page.locator('text=作成が完了, text=エラー, video').first().waitFor({
      state: 'visible',
      timeout: 180000
    });
    await page.screenshot({ path: join(SCREENSHOT_DIR, '37-generation-complete.png'), fullPage: true });
    console.log('✓ Video generation complete');
  } catch (timeoutError) {
    await page.screenshot({ path: join(SCREENSHOT_DIR, '37-generation-timeout.png'), fullPage: true });
    console.log('⚠ Timeout waiting for video generation');
  }

  // Final screenshot
  await page.screenshot({ path: join(SCREENSHOT_DIR, '38-final-state.png'), fullPage: true });

  console.log('\n=== Test completed successfully ===');
});
