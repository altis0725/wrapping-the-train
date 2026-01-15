#!/usr/bin/env node

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = '/Users/altis/Documents/wrapping-the-train/test-screenshots/free-video-creation';
const BASE_URL = 'http://localhost:3000';
const COOKIE = {
  name: 'app_session_id',
  value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuSWQiOiJkZXZfdXNlcl8wMDEiLCJuYW1lIjoiRGV2IFVzZXIiLCJpYXQiOjE3NjgzOTY5MjUsImV4cCI6MTc3MDk4ODkyNX0.9K0I1zb2Il7O827CmOZkEvUJOVnYF-1xRw14xN1EsZA',
  domain: 'localhost',
  path: '/',
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, filename) {
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`✓ Screenshot saved: ${filename}`);
}

async function main() {
  console.log('Starting free video creation test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Set cookie
    console.log('Setting authentication cookie...');
    await page.setCookie(COOKIE);

    // Step 1: Navigate to /create
    console.log('\nStep 1: Navigating to /create page...');
    await page.goto(`${BASE_URL}/create`, { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot(page, '40-page-loaded.png');

    // Step 2: Select background template
    console.log('\nStep 2: Selecting background template...');
    const backgroundCards = await page.$$('[data-testid="template-card"]');
    if (backgroundCards.length === 0) {
      throw new Error('No background template cards found');
    }
    await backgroundCards[0].click();
    await sleep(500);
    await takeScreenshot(page, '41-background-selected.png');

    // Step 3: Click "Next" button
    console.log('\nStep 3: Clicking next button...');
    const nextButton1 = await page.$('button:has-text("次へ")');
    if (!nextButton1) {
      // Try alternative selector
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent);
        if (text?.includes('次へ')) {
          await button.click();
          break;
        }
      }
    } else {
      await nextButton1.click();
    }
    await sleep(1000);
    await takeScreenshot(page, '42-step2-window.png');

    // Step 4: Select window template
    console.log('\nStep 4: Selecting window template...');
    const windowCards = await page.$$('[data-testid="template-card"]');
    if (windowCards.length === 0) {
      throw new Error('No window template cards found');
    }
    await windowCards[0].click();
    await sleep(500);
    await takeScreenshot(page, '43-window-selected.png');

    // Step 5: Click "Next" button
    console.log('\nStep 5: Clicking next button...');
    const buttons2 = await page.$$('button');
    for (const button of buttons2) {
      const text = await button.evaluate(el => el.textContent);
      if (text?.includes('次へ')) {
        await button.click();
        break;
      }
    }
    await sleep(1000);
    await takeScreenshot(page, '44-step3-wheel.png');

    // Step 6: Select wheel template
    console.log('\nStep 6: Selecting wheel template...');
    const wheelCards = await page.$$('[data-testid="template-card"]');
    if (wheelCards.length === 0) {
      throw new Error('No wheel template cards found');
    }
    await wheelCards[0].click();
    await sleep(500);
    await takeScreenshot(page, '45-wheel-selected.png');

    // Step 7: Click "動画を作成" button
    console.log('\nStep 7: Clicking create video button...');
    const buttons3 = await page.$$('button');
    for (const button of buttons3) {
      const text = await button.evaluate(el => el.textContent);
      if (text?.includes('動画を作成')) {
        await button.click();
        break;
      }
    }
    await sleep(2000);
    await takeScreenshot(page, '46-video-creation-started.png');

    // Step 8: Wait for video generation (max 3 minutes)
    console.log('\nStep 8: Waiting for video generation (max 3 minutes)...');
    const maxWaitTime = 180000; // 3 minutes
    const startTime = Date.now();
    let success = false;

    while (Date.now() - startTime < maxWaitTime) {
      // Check for success indicators
      const pageContent = await page.content();

      if (pageContent.includes('動画が完成しました') ||
          pageContent.includes('完成') ||
          pageContent.includes('マイページ')) {
        success = true;
        break;
      }

      // Check for errors
      if (pageContent.includes('エラー') || pageContent.includes('失敗')) {
        throw new Error('Video generation failed');
      }

      await sleep(5000); // Check every 5 seconds
      console.log(`  ... waiting (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);
    }

    if (!success) {
      throw new Error('Video generation timeout (3 minutes exceeded)');
    }

    await takeScreenshot(page, '47-video-completed.png');
    console.log('\n✓ Video generation completed!');

    // Step 9: Navigate to mypage
    console.log('\nStep 9: Checking mypage...');
    await page.goto(`${BASE_URL}/mypage`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await takeScreenshot(page, '48-mypage-with-video.png');

    // Check if video is displayed
    const videoElements = await page.$$('video, [data-testid="video-item"]');
    if (videoElements.length === 0) {
      throw new Error('No videos found on mypage');
    }

    console.log('\n✓ Test completed successfully!');
    console.log(`✓ Found ${videoElements.length} video(s) on mypage`);

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    await takeScreenshot(page, '99-error.png');
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
