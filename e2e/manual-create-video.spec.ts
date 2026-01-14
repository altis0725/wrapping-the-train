import { test, expect } from '@playwright/test';

test('無料動画作成フロー', async ({ page, context }) => {
  let counter = 30;

  // セッションCookie設定
  await context.addCookies([{
    name: 'app_session_id',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuSWQiOiJkZXZfdXNlcl8wMDEiLCJuYW1lIjoiRGV2IFVzZXIiLCJpYXQiOjE3NjgzOTg3MzYsImV4cCI6MTc3MDk5MDczNn0.QJ0Xv1WlbBYyjdjAV3iqQY72d_eK_bJzc0iBhPBVKyk',
    domain: 'localhost',
    path: '/',
  }]);

  console.log('=== 無料動画作成フローテスト開始 ===\n');

  // Step 1: ページアクセス
  console.log('Step 1: /create ページにアクセス中...');
  await page.goto('http://localhost:3000/create');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `test-screenshots/${counter++}-01-initial-page.png`, fullPage: true });
  console.log('✓ ページ読み込み完了\n');

  // Step 2: 背景テンプレート選択
  console.log('Step 2: 背景テンプレートを選択中...');
  await page.waitForTimeout(1000);

  const bgSelector = 'button:has-text("選択"), [role="button"], .cursor-pointer';
  const bgElements = await page.locator(bgSelector).all();

  if (bgElements.length > 0) {
    await bgElements[0].click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-screenshots/${counter++}-02-bg-selected.png`, fullPage: true });
    console.log('✓ 背景テンプレート選択完了\n');
  }

  // 「次へ」ボタンをクリック
  console.log('Step 3: 次へボタンをクリック...');
  const nextBtn1 = page.locator('button:has-text("次へ")').first();
  if (await nextBtn1.isVisible()) {
    await nextBtn1.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-screenshots/${counter++}-03-step2-page.png`, fullPage: true });
    console.log('✓ ステップ2へ遷移\n');
  }

  // Step 4: 窓テンプレート選択
  console.log('Step 4: 窓テンプレートを選択中...');
  await page.waitForTimeout(500);
  const windowElements = await page.locator(bgSelector).all();

  if (windowElements.length > 0) {
    await windowElements[0].click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-screenshots/${counter++}-04-window-selected.png`, fullPage: true });
    console.log('✓ 窓テンプレート選択完了\n');
  }

  // 「次へ」ボタンをクリック
  console.log('Step 5: 次へボタンをクリック...');
  const nextBtn2 = page.locator('button:has-text("次へ")').first();
  if (await nextBtn2.isVisible()) {
    await nextBtn2.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-screenshots/${counter++}-05-step3-page.png`, fullPage: true });
    console.log('✓ ステップ3へ遷移\n');
  }

  // Step 6: 車輪テンプレート選択
  console.log('Step 6: 車輪テンプレートを選択中...');
  await page.waitForTimeout(500);
  const wheelElements = await page.locator(bgSelector).all();

  if (wheelElements.length > 0) {
    await wheelElements[0].click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-screenshots/${counter++}-06-wheel-selected.png`, fullPage: true });
    console.log('✓ 車輪テンプレート選択完了\n');
  }

  // Step 7: 「動画を作成」ボタンをクリック
  console.log('Step 7: 動画を作成ボタンをクリック...');

  // コンソールエラーとネットワークをキャプチャ
  const errors: string[] = [];
  const requests: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('ブラウザエラー:', msg.text());
      errors.push(msg.text());
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/create') || url.includes('/api/')) {
      const status = response.status();
      console.log(`  Network: ${status} ${url}`);
      requests.push(`${status} ${url}`);

      if (status >= 400) {
        try {
          const body = await response.text();
          console.log(`  Response: ${body.substring(0, 200)}`);
        } catch (e) {
          // ignore
        }
      }
    }
  });

  const createBtn = page.locator('button:has-text("動画を作成"), button:has-text("作成")').first();
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `test-screenshots/${counter++}-07-creating-start.png`, fullPage: true });
    console.log('✓ 動画作成を開始\n');

    if (errors.length > 0) {
      console.log('⚠ コンソールエラー検出:', errors.join(', '));
    }
  }

  // Step 8: 動画生成を待機
  console.log('Step 8: 動画生成を待機中（最大3分）...');
  const maxWaitSeconds = 180;
  let elapsedSeconds = 0;
  let completed = false;

  while (elapsedSeconds < maxWaitSeconds) {
    await page.waitForTimeout(5000);
    elapsedSeconds += 5;

    const pageContent = await page.content();
    const currentUrl = page.url();

    // デバッグ: URL変化をログ
    if (elapsedSeconds === 5) {
      console.log(`  現在のURL: ${currentUrl}`);

      // エラーメッセージを探す
      const errorElement = await page.locator('text=/エラー|失敗|Error|問題|できません/i').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log(`  エラーメッセージ: ${errorText}`);
      }
    }

    // 完成・成功パターン
    if (
      pageContent.includes('完成') ||
      pageContent.includes('成功') ||
      pageContent.includes('ダウンロード') ||
      currentUrl.includes('/mypage')
    ) {
      console.log(`✓ 動画生成が完了しました（${elapsedSeconds}秒後）\n`);
      await page.screenshot({ path: `test-screenshots/${counter++}-08-completed.png`, fullPage: true });
      completed = true;
      break;
    }

    // 失敗・エラーパターン
    if (
      pageContent.includes('失敗') ||
      pageContent.includes('エラー') ||
      pageContent.includes('Error')
    ) {
      console.log(`✗ 動画生成が失敗しました（${elapsedSeconds}秒後）\n`);

      // エラー詳細を取得
      const errorElement = await page.locator('text=/エラー|失敗|Error/i').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log(`  エラー内容: ${errorText}`);
      }

      await page.screenshot({ path: `test-screenshots/${counter++}-08-failed.png`, fullPage: true });
      completed = true;
      break;
    }

    // 30秒ごとに進捗をスクリーンショット
    if (elapsedSeconds % 30 === 0) {
      await page.screenshot({ path: `test-screenshots/${counter++}-progress-${elapsedSeconds}s.png`, fullPage: true });
      console.log(`  処理中... (${elapsedSeconds}秒経過)`);
    }
  }

  if (!completed) {
    console.log(`⚠ タイムアウト: 3分経過しましたが動画生成が完了しませんでした\n`);
    await page.screenshot({ path: `test-screenshots/${counter++}-timeout.png`, fullPage: true });
  }

  // 最終状態
  await page.screenshot({ path: `test-screenshots/${counter++}-final.png`, fullPage: true });
  console.log('\n=== テスト完了 ===');
});
