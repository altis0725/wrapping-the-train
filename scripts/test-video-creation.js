const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = '/Users/altis/Documents/wrapping-the-train/test-screenshots';
const SESSION_COOKIE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuSWQiOiJkZXZfdXNlcl8wMDEiLCJuYW1lIjoiRGV2IFVzZXIiLCJpYXQiOjE3NjgzOTY5MjUsImV4cCI6MTc3MDk4ODkyNX0.9K0I1zb2Il7O827CmOZkEvUJOVnYF-1xRw14xN1EsZA';

let screenshotCounter = 10;

async function takeScreenshot(page, name) {
  const filename = `${screenshotCounter}-${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`✓ Screenshot saved: ${filename}`);
  screenshotCounter++;
  return filepath;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Starting video creation flow test...\n');

  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  try {
    // Set session cookie
    console.log('Setting session cookie...');
    await page.setCookie({
      name: 'app_session_id',
      value: SESSION_COOKIE,
      domain: 'localhost',
      path: '/',
    });
    console.log('✓ Cookie set\n');

    // Navigate to create page
    console.log('Step 1: Opening http://localhost:3000/create');
    await page.goto('http://localhost:3000/create', { waitUntil: 'networkidle0' });
    await delay(2000);
    await takeScreenshot(page, 'initial-create-page');

    // Step 1: Select background template
    console.log('\nStep 2: Selecting background template');
    const bgTemplate = await page.waitForSelector('[data-step="1"] [role="button"]', { timeout: 5000 });
    await bgTemplate.click();
    await delay(1000);
    await takeScreenshot(page, 'after-background-selected');

    // Click "Next" button for step 1
    console.log('\nStep 3: Clicking "Next" button (background → window)');
    const nextBtn1 = await page.waitForSelector('button:has-text("次へ"), button::-p-text(次へ)', { timeout: 5000 });
    await nextBtn1.click();
    await delay(1000);
    await takeScreenshot(page, 'step2-window-selection');

    // Step 2: Select window template
    console.log('\nStep 4: Selecting window template');
    const windowTemplate = await page.waitForSelector('[data-step="2"] [role="button"]', { timeout: 5000 });
    await windowTemplate.click();
    await delay(1000);
    await takeScreenshot(page, 'after-window-selected');

    // Click "Next" button for step 2
    console.log('\nStep 5: Clicking "Next" button (window → wheel)');
    const nextBtn2 = await page.waitForSelector('button:has-text("次へ"), button::-p-text(次へ)', { timeout: 5000 });
    await nextBtn2.click();
    await delay(1000);
    await takeScreenshot(page, 'step3-wheel-selection');

    // Step 3: Select wheel template
    console.log('\nStep 6: Selecting wheel template');
    const wheelTemplate = await page.waitForSelector('[data-step="3"] [role="button"]', { timeout: 5000 });
    await wheelTemplate.click();
    await delay(1000);
    await takeScreenshot(page, 'after-wheel-selected');

    // Click "Create Video" button
    console.log('\nStep 7: Clicking "Create Video" button');
    const createBtn = await page.waitForSelector('button:has-text("動画を作成"), button::-p-text(動画を作成)', { timeout: 5000 });
    await createBtn.click();
    await delay(2000);
    await takeScreenshot(page, 'video-generation-started');

    // Wait for video generation (poll every 5 seconds, max 3 minutes)
    console.log('\nStep 8: Waiting for video generation (max 3 minutes)...');
    let attempts = 0;
    const maxAttempts = 36; // 3 minutes / 5 seconds
    let videoComplete = false;

    while (attempts < maxAttempts && !videoComplete) {
      await delay(5000);
      attempts++;

      // Check for completion indicator (video player or download button)
      const videoPlayer = await page.$('video');
      const downloadBtn = await page.$('button:has-text("ダウンロード"), a:has-text("ダウンロード")');

      if (videoPlayer || downloadBtn) {
        videoComplete = true;
        console.log(`✓ Video generation complete after ${attempts * 5} seconds`);
      } else {
        console.log(`  Waiting... (${attempts * 5}s elapsed)`);
      }
    }

    if (videoComplete) {
      await takeScreenshot(page, 'video-generation-complete');
      console.log('\n✓ Test completed successfully!');
    } else {
      await takeScreenshot(page, 'video-generation-timeout');
      console.log('\n⚠ Video generation timed out after 3 minutes');
    }

  } catch (error) {
    console.error('\n✗ Error during test:', error.message);
    await takeScreenshot(page, 'error-state');
  } finally {
    console.log('\nClosing browser...');
    await browser.close();
    console.log('✓ Test finished');
  }
}

main().catch(console.error);
