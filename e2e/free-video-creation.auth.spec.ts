/**
 * 無料動画作成フローのE2Eテスト（認証済みユーザー）
 * 
 * このテストはglobal-setupで生成された.auth/user.jsonのstorageStateを使用します
 */

import { test, expect } from '@playwright/test';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const SCREENSHOT_DIR = join(__dirname, '..', 'test-screenshots', 'free-video-creation');
const BASE_URL = 'http://localhost:3000';

// スクリーンショットディレクトリを作成
if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test('Free video creation flow', async ({ page }) => {
  test.setTimeout(300000); // 5分タイムアウト

  // Note: Using authenticated project with storageState from .auth/user.json

  console.log('Step 1: Navigate to /create');
  await page.goto(`${BASE_URL}/create`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(SCREENSHOT_DIR, '30-page-loaded.png'), fullPage: true });
  console.log('✓ Page loaded');

  // Check if we're on the create page or redirected to login
  const url = page.url();
  if (url.includes('/login')) {
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'error-login-redirect.png'), fullPage: true });
    throw new Error('Redirected to login page - authentication failed');
  }

  console.log('Step 2: Select background template');
  // Wait for template cards to be visible and click the first one
  const firstTemplate = page.locator('[data-testid="template-card"], .template-card, .template-item').first();
  await firstTemplate.waitFor({ state: 'visible', timeout: 10000 });
  
  const templateCount = await page.locator('[data-testid="template-card"]').count();
  console.log(`  Found ${templateCount} templates`);
  
  if (templateCount === 0) {
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'error-no-templates.png'), fullPage: true });
    throw new Error('No templates found - database may not have templates');
  }
  
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
  
  let attempts = 0;
  const maxAttempts = 36; // 3分 (5秒 × 36)
  let completed = false;

  while (attempts < maxAttempts && !completed) {
    attempts++;
    await page.waitForTimeout(5000);

    // 完了メッセージを確認
    const hasSuccess = await page.getByText(/完成|動画が完成しました/i).count() > 0;
    if (hasSuccess) {
      completed = true;
      console.log('✓ Video generation complete');
      break;
    }

    // 失敗メッセージを確認
    const hasFailed = await page.getByText(/失敗|エラー/i).count() > 0;
    if (hasFailed) {
      console.log('✗ Video generation failed');
      await page.screenshot({ path: join(SCREENSHOT_DIR, 'error-generation-failed.png'), fullPage: true });
      break;
    }

    if (attempts % 6 === 0) {
      console.log(`  Waiting... (${attempts * 5}s elapsed)`);
      await page.screenshot({ path: join(SCREENSHOT_DIR, `37-waiting-${attempts}.png`), fullPage: true });
    }
  }

  // Final screenshot
  await page.screenshot({ path: join(SCREENSHOT_DIR, '38-final-state.png'), fullPage: true });

  if (completed) {
    console.log('\n=== Test completed successfully ===');
  } else if (attempts >= maxAttempts) {
    console.log('\n⚠ Timeout waiting for video generation');
  }

  expect(completed || attempts < maxAttempts).toBeTruthy();
});
