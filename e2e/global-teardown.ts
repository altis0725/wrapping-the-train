/**
 * Playwright globalTeardown
 *
 * テスト実行後に以下を行う:
 * 1. テストデータをDBから削除
 * 2. Storage Stateファイルを削除
 *
 * 識別方法:
 * - loginMethod = 'test' のユーザー
 * - openIdが 'test_' prefix のユーザー
 * - idが 9900以上のテンプレート
 */

import { FullConfig } from "@playwright/test";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql, or } from "drizzle-orm";
import * as fs from "fs/promises";
import * as path from "path";
import { STORAGE_STATE_PATHS } from "./fixtures/test-users";

// スキーマをインポート
import {
  users,
  templates,
  videos,
  reservations,
} from "../src/db/schema";

async function globalTeardown(config: FullConfig) {
  console.log("🧹 E2E globalTeardown: Starting...");

  // 環境変数読み込み
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: ".env.local" });
    dotenv.config({ path: ".env" });
  } catch {
    // dotenvがない場合は環境変数が直接設定されていると想定
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("  ⚠️ DATABASE_URL not set, skipping DB cleanup");
    return;
  }

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, {
    schema: { users, templates, videos, reservations },
  });

  try {
    // 1. テストデータをクリーンアップ
    console.log("  📦 Cleaning up test data...");
    await cleanupTestData(db);

    // 2. Storage Stateファイルを削除
    console.log("  🗑️ Removing storage state files...");
    await cleanupStorageStates();

    console.log("✅ E2E globalTeardown: Completed successfully");
  } catch (error) {
    console.error("❌ E2E globalTeardown: Failed", error);
    // Teardownの失敗はテスト結果に影響させない
  } finally {
    await client.end();
  }
}

async function cleanupTestData(db: ReturnType<typeof drizzle>) {
  // 関連データの削除順序: reservations → videos → users
  const testUserCondition = or(
    eq(users.loginMethod, "test"),
    sql`${users.openId} LIKE 'test_%'`
  );

  // 予約の削除
  const deletedReservations = await db.delete(reservations).where(
    sql`${reservations.userId} IN (
      SELECT id FROM users WHERE login_method = 'test' OR open_id LIKE 'test_%'
    )`
  );
  console.log(`    Deleted reservations`);

  // 動画の削除
  const deletedVideos = await db.delete(videos).where(
    sql`${videos.userId} IN (
      SELECT id FROM users WHERE login_method = 'test' OR open_id LIKE 'test_%'
    )`
  );
  console.log(`    Deleted videos`);

  // テストユーザーの削除
  const deletedUsers = await db.delete(users).where(testUserCondition);
  console.log(`    Deleted test users`);

  // テストテンプレートの削除
  const deletedTemplates = await db.delete(templates).where(
    sql`${templates.id} >= 9900`
  );
  console.log(`    Deleted test templates`);
}

async function cleanupStorageStates() {
  const authDir = path.join(process.cwd(), ".auth");

  for (const storagePath of Object.values(STORAGE_STATE_PATHS)) {
    try {
      await fs.unlink(storagePath);
      console.log(`    Removed: ${storagePath}`);
    } catch {
      // ファイルが存在しない場合は無視
    }
  }

  // .authディレクトリが空なら削除
  try {
    const files = await fs.readdir(authDir);
    if (files.length === 0) {
      await fs.rmdir(authDir);
      console.log(`    Removed: ${authDir}`);
    }
  } catch {
    // ディレクトリが存在しない場合は無視
  }
}

export default globalTeardown;
