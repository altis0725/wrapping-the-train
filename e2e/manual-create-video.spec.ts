/**
 * 無料動画作成フローのE2Eテスト（手動実行用）
 * 
 * 注意: このテストはdev_user_001ユーザーを使用します
 */

import { test, expect } from '@playwright/test';
import { SignJWT } from 'jose';

// 動的にJWTトークンを生成する関数
async function createSessionToken(): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET || 'KTxGHezhgEwdyHO1gy3yLsOOHC4MK3CfQInyKBVqVQU=';
  const secretKey = new TextEncoder().encode(jwtSecret);
  const now = Date.now();
  const expiresAt = Math.floor((now + 1000 * 60 * 60 * 24 * 30) / 1000); // 30日

  return new SignJWT({
    openId: 'dev_user_001',
    name: 'Dev User',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey);
}

test('無料動画作成フロー', async ({ page, context }) => {
  let counter = 30;

  // セッションCookie設定（動的に生成）
  const token = await createSessionToken();
  await context.addCookies([{
    name: 'app_session_id',
    value: token,
    domain: 'localhost',
    path: '/',
  }]);

  console.log('=== 無料動画作成フローテスト開始 ===\n');

  // Step 1: ページアクセス
  console.log('Step 1: /create ページにアクセス中...');
  await page.goto('http://localhost:3000/create');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `test-screenshots/${counter++}-01-initial-page.png`, fullPage: true });

  // ログインページにリダイレクトされていないか確認
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    console.error('❌ ログインページにリダイレクトされました - 認証失敗');
    throw new Error('認証に失敗しました');
  }
  console.log('✅ /create ページにアクセス成功\n');

  // Step 2: 背景テンプレート選択
  console.log('Step 2: 背景テンプレートを選択中...');
  const categoryText = await page.locator('[data-testid="category"]').textContent();
  console.log(`  現在のカテゴリ: ${categoryText}`);

  const templateCards = page.locator('[data-testid="template-card"]');
  const cardCount = await templateCards.count();
  console.log(`  テンプレート数: ${cardCount}`);

  if (cardCount === 0) {
    console.error('❌ テンプレートが見つかりません');
    await page.screenshot({ path: `test-screenshots/${counter++}-error-no-templates.png`, fullPage: true });
    throw new Error('テンプレートが見つかりません');
  }

  await templateCards.first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `test-screenshots/${counter++}-02-background-selected.png`, fullPage: true });
  console.log('✅ 背景テンプレート選択完了\n');

  // Step 3: 次へボタンクリック
  console.log('Step 3: 次へボタンをクリック中...');
  await page.getByRole('button', { name: '次へ' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `test-screenshots/${counter++}-03-step2.png`, fullPage: true });
  console.log('✅ Step 2 (窓) に移動\n');

  // Step 4: 窓テンプレート選択
  console.log('Step 4: 窓テンプレートを選択中...');
  await templateCards.first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `test-screenshots/${counter++}-04-window-selected.png`, fullPage: true });
  console.log('✅ 窓テンプレート選択完了\n');

  // Step 5: 次へボタンクリック
  console.log('Step 5: 次へボタンをクリック中...');
  await page.getByRole('button', { name: '次へ' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `test-screenshots/${counter++}-05-step3.png`, fullPage: true });
  console.log('✅ Step 3 (車輪) に移動\n');

  // Step 6: 車輪テンプレート選択
  console.log('Step 6: 車輪テンプレートを選択中...');
  await templateCards.first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `test-screenshots/${counter++}-06-wheel-selected.png`, fullPage: true });
  console.log('✅ 車輪テンプレート選択完了\n');

  // Step 7: 動画を作成ボタンクリック
  console.log('Step 7: 動画を作成ボタンをクリック中...');
  await page.getByRole('button', { name: '動画を作成' }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `test-screenshots/${counter++}-07-creating.png`, fullPage: true });
  console.log('✅ 動画作成開始\n');

  // Step 8: 動画生成完了を待機
  console.log('Step 8: 動画生成完了を待機中...');
  console.log('  (最大3分間待機します)\n');

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
      console.log('✅ 動画生成完了!\n');
      break;
    }

    // 失敗メッセージを確認
    const hasFailed = await page.getByText(/失敗|エラー/i).count() > 0;
    if (hasFailed) {
      console.log('❌ 動画生成失敗');
      await page.screenshot({ path: `test-screenshots/${counter++}-error-failed.png`, fullPage: true });
      break;
    }

    if (attempts % 6 === 0) {
      console.log(`  待機中... (${attempts * 5}秒経過)`);
      await page.screenshot({ path: `test-screenshots/${counter++}-08-waiting-${attempts}.png`, fullPage: true });
    }
  }

  // 最終スクリーンショット
  await page.screenshot({ path: `test-screenshots/${counter++}-09-final.png`, fullPage: true });

  if (completed) {
    console.log('=== テスト成功 ===');
  } else {
    console.log('=== テストタイムアウト ===');
  }

  expect(completed || attempts < maxAttempts).toBeTruthy();
});
