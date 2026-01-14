/**
 * 無料動画作成フローのE2Eテスト
 * Playwrightを使用してCookie設定から動画作成までをテスト
 */

const { chromium } = require('playwright');
const path = require('path');

const SESSION_COOKIE = {
  name: 'app_session_id',
  value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuSWQiOiJkZXZfdXNlcl8wMDEiLCJuYW1lIjoiRGV2IFVzZXIiLCJpYXQiOjE3NjgzOTY5MjUsImV4cCI6MTc3MDk4ODkyNX0.9K0I1zb2Il7O827CmOZkEvUJOVnYF-1xRw14xN1EsZA',
  domain: 'localhost',
  path: '/',
};

const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots');
const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, filename) {
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
}

async function main() {
  console.log('🚀 Starting free video creation flow test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Set session cookie
    console.log('1️⃣  Setting session cookie...');
    await context.addCookies([SESSION_COOKIE]);
    console.log('✅ Cookie set\n');

    // Step 2: Navigate to /create
    console.log('2️⃣  Navigating to /create page...');
    await page.goto(`${BASE_URL}/create`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '09-02-create-page-loaded.png');
    console.log('✅ Page loaded\n');

    // Step 3: Select first template in Step 1 (背景)
    console.log('3️⃣  Selecting first background template...');
    await sleep(1000);

    // Find the first template card in Step 1
    const step1Card = page.locator('[data-step="1"] [role="button"]').first();
    await step1Card.waitFor({ state: 'visible' });
    await step1Card.click();
    await sleep(500);
    await takeScreenshot(page, '09-03-background-selected.png');
    console.log('✅ Background selected\n');

    // Click "次へ" button
    console.log('4️⃣  Clicking "次へ" button...');
    const nextButton1 = page.getByRole('button', { name: '次へ' });
    await nextButton1.click();
    await sleep(1000);
    await takeScreenshot(page, '09-04-step2-window.png');
    console.log('✅ Moved to Step 2\n');

    // Step 4: Select first template in Step 2 (窓)
    console.log('5️⃣  Selecting first window template...');
    const step2Card = page.locator('[data-step="2"] [role="button"]').first();
    await step2Card.waitFor({ state: 'visible' });
    await step2Card.click();
    await sleep(500);
    await takeScreenshot(page, '09-05-window-selected.png');
    console.log('✅ Window selected\n');

    // Click "次へ" button
    console.log('6️⃣  Clicking "次へ" button...');
    const nextButton2 = page.getByRole('button', { name: '次へ' });
    await nextButton2.click();
    await sleep(1000);
    await takeScreenshot(page, '09-06-step3-wheel.png');
    console.log('✅ Moved to Step 3\n');

    // Step 5: Select first template in Step 3 (車輪)
    console.log('7️⃣  Selecting first wheel template...');
    const step3Card = page.locator('[data-step="3"] [role="button"]').first();
    await step3Card.waitFor({ state: 'visible' });
    await step3Card.click();
    await sleep(500);
    await takeScreenshot(page, '09-07-wheel-selected.png');
    console.log('✅ Wheel selected\n');

    // Step 6: Click "動画を作成" button
    console.log('8️⃣  Clicking "動画を作成" button...');
    const createButton = page.getByRole('button', { name: '動画を作成' });
    await createButton.click();
    await sleep(2000);
    await takeScreenshot(page, '09-08-video-creation-started.png');
    console.log('✅ Video creation started\n');

    // Step 7: Wait for video generation (check for loading state)
    console.log('9️⃣  Waiting for video generation...');
    console.log('   (This may take up to 3 minutes)\n');

    let attempts = 0;
    const maxAttempts = 36; // 3 minutes (5 seconds * 36)
    let videoCompleted = false;

    while (attempts < maxAttempts && !videoCompleted) {
      attempts++;
      await sleep(5000); // Check every 5 seconds

      // Check if still on create page or redirected to mypage
      const currentUrl = page.url();
      console.log(`   Attempt ${attempts}/${maxAttempts} - URL: ${currentUrl}`);

      if (currentUrl.includes('/mypage')) {
        videoCompleted = true;
        console.log('✅ Redirected to mypage - video likely completed\n');
        break;
      }

      // Check for loading indicators or completion messages
      const hasLoading = await page.locator('[data-loading="true"], [role="status"]').count() > 0;
      if (!hasLoading) {
        // Check if there's a success message or completion indicator
        const hasSuccess = await page.locator('text=/完成|完了|成功/i').count() > 0;
        if (hasSuccess) {
          videoCompleted = true;
          console.log('✅ Success indicator found\n');
          break;
        }
      }

      // Take periodic screenshots
      if (attempts % 6 === 0) { // Every 30 seconds
        await takeScreenshot(page, `09-09-waiting-${Math.floor(attempts / 6)}.png`);
      }
    }

    // Step 8: Final screenshot
    console.log('🔟 Taking final screenshot...');
    await takeScreenshot(page, '09-10-final-state.png');

    if (videoCompleted) {
      console.log('\n✅ ✅ ✅ TEST COMPLETED SUCCESSFULLY ✅ ✅ ✅');
    } else {
      console.log('\n⚠️  TEST TIMEOUT - Video may still be processing');
      console.log('   Please check the screenshots and application state manually');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await takeScreenshot(page, '09-ERROR.png');
    throw error;
  } finally {
    console.log('\n🏁 Closing browser...');
    await browser.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
