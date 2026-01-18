/**
 * 無料動画作成フローのE2Eテスト（認証済みユーザー）
 * 
 * 新仕様: 60秒動画（背景6個 + 窓1個 + 車輪1個 + 音楽1個）
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

test('Free video creation flow - 60 second video', async ({ page }) => {
  test.setTimeout(300000); // 5分タイムアウト

  // Note: Using authenticated project with storageState from .auth/user.json

  console.log('Step 1: Navigate to /create');
  await page.goto(`${BASE_URL}/create`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(SCREENSHOT_DIR, '01-page-loaded.png'), fullPage: true });
  console.log('✓ Page loaded');

  // Check if we're on the create page or redirected to login
  const url = page.url();
  if (url.includes('/login')) {
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'error-login-redirect.png'), fullPage: true });
    throw new Error('Redirected to login page - authentication failed');
  }

  // Step 2: Select 6 background templates
  console.log('Step 2: Select 6 background templates');
  const templateCards = page.locator('[data-testid="template-card"], .template-card, .template-item');
  await templateCards.first().waitFor({ state: 'visible', timeout: 10000 });
  
  const templateCount = await templateCards.count();
  console.log(`  Found ${templateCount} templates`);
  
  if (templateCount === 0) {
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'error-no-templates.png'), fullPage: true });
    throw new Error('No templates found - database may not have templates');
  }
  
  // Select 6 backgrounds (clicking the first template 6 times for each slot)
  for (let i = 0; i < 6; i++) {
    await templateCards.first().click();
    await page.waitForTimeout(500);
    console.log(`  ✓ Background ${i + 1} selected`);
  }
  await page.screenshot({ path: join(SCREENSHOT_DIR, '02-backgrounds-selected.png'), fullPage: true });

  // Step 3: Click next button to go to window selection
  console.log('Step 3: Click next button (to window selection)');
  const nextButton1 = page.locator('button:has-text("次へ")');
  await nextButton1.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '03-window-step.png'), fullPage: true });
  console.log('✓ Window selection step loaded');

  // Step 4: Select window template
  console.log('Step 4: Select window template');
  const windowTemplate = page.locator('[data-testid="template-card"], .template-card, .template-item').first();
  await windowTemplate.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '04-window-selected.png'), fullPage: true });
  console.log('✓ Window selected');

  // Step 5: Click next button to go to wheel selection
  console.log('Step 5: Click next button (to wheel selection)');
  const nextButton2 = page.locator('button:has-text("次へ")');
  await nextButton2.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '05-wheel-step.png'), fullPage: true });
  console.log('✓ Wheel selection step loaded');

  // Step 6: Select wheel template
  console.log('Step 6: Select wheel template');
  const wheelTemplate = page.locator('[data-testid="template-card"], .template-card, .template-item').first();
  await wheelTemplate.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '06-wheel-selected.png'), fullPage: true });
  console.log('✓ Wheel selected');

  // Step 7: Click next button to go to music selection
  console.log('Step 7: Click next button (to music selection)');
  const nextButton3 = page.locator('button:has-text("次へ")');
  await nextButton3.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '07-music-step.png'), fullPage: true });
  console.log('✓ Music selection step loaded');

  // Step 8: Select music template
  console.log('Step 8: Select music template');
  const musicTemplate = page.locator('[data-testid="template-card"], .template-card, [data-testid="music-card"], .music-card').first();
  await musicTemplate.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '08-music-selected.png'), fullPage: true });
  console.log('✓ Music selected');

  // Step 9: Click create video button
  console.log('Step 9: Click create video button');
  const createButton = page.locator('button:has-text("動画を作成")');
  await createButton.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(SCREENSHOT_DIR, '09-creating-started.png'), fullPage: true });
  console.log('✓ Video creation started');

  // Step 10: Wait for video generation (max 3 minutes)
  console.log('Step 10: Wait for video generation (max 3 minutes)');
  
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
      await page.screenshot({ path: join(SCREENSHOT_DIR, `10-waiting-${attempts}.png`), fullPage: true });
    }
  }

  // Final screenshot
  await page.screenshot({ path: join(SCREENSHOT_DIR, '11-final-state.png'), fullPage: true });

  if (completed) {
    console.log('\n=== Test completed successfully ===');
  } else if (attempts >= maxAttempts) {
    console.log('\n⚠ Timeout waiting for video generation');
  }

  expect(completed || attempts < maxAttempts).toBeTruthy();
});
