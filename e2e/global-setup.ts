/**
 * Playwright globalSetup
 *
 * テスト実行前に以下を行う:
 * 1. テストユーザーをDBに作成
 * 2. テスト用テンプレート・動画・予約を作成
 * 3. 各ユーザーのStorage Stateファイルを生成
 *
 * アプリコード内にテスト用APIを作らず、DB直接操作 + Cookie注入で実現
 */

import { chromium, FullConfig } from "@playwright/test";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql, and, or } from "drizzle-orm";
import { SignJWT } from "jose";
import * as fs from "fs/promises";
import * as path from "path";
import {
  TEST_USERS,
  TEST_TEMPLATES,
  STORAGE_STATE_PATHS,
  createTestVideos,
  createTestReservations,
} from "./fixtures/test-users";

// スキーマをインポート
import {
  users,
  templates,
  videos,
  reservations,
  payments,
} from "../src/db/schema";

// 環境変数チェック
function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is required for E2E tests`);
  }
  return value;
}

// JWT生成（session.tsの関数を直接使えないためここで再実装）
async function createTestSessionToken(
  openId: string,
  name: string
): Promise<string> {
  const jwtSecret = getEnvOrThrow("JWT_SECRET");
  const secretKey = new TextEncoder().encode(jwtSecret);
  const now = Date.now();
  const expiresAt = Math.floor((now + 1000 * 60 * 60 * 24 * 30) / 1000); // 30日

  return new SignJWT({
    openId,
    name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey);
}

async function globalSetup(config: FullConfig) {
  console.log("🔧 E2E globalSetup: Starting...");

  // 環境変数読み込み（.env.localが存在する場合）
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: ".env.local" });
    dotenv.config({ path: ".env" });
  } catch {
    // dotenvがない場合は環境変数が直接設定されていると想定
  }

  // DB接続
  const connectionString = getEnvOrThrow("DATABASE_URL");
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, {
    schema: { users, templates, videos, reservations, payments },
  });

  try {
    // 1. 既存のテストデータをクリーンアップ
    console.log("  📦 Cleaning up existing test data...");
    await cleanupTestData(db);

    // 2. テストユーザーを作成
    console.log("  👤 Creating test users...");
    const userIdMap = await createTestUsers(db);

    // 3. テストテンプレートを作成
    console.log("  🎨 Creating test templates...");
    await createTestTemplates(db);

    // 4. テスト動画・予約を作成
    console.log("  🎬 Creating test videos and reservations...");
    await createTestData(db, userIdMap);

    // 5. Storage Stateファイルを生成
    console.log("  🔐 Generating storage states...");
    await generateStorageStates(config);

    console.log("✅ E2E globalSetup: Completed successfully");
  } catch (error) {
    console.error("❌ E2E globalSetup: Failed", error);
    throw error;
  } finally {
    await client.end();
  }
}

async function cleanupTestData(db: ReturnType<typeof drizzle>) {
  // 関連データの削除順序: reservations → videos → users
  // テストユーザーを特定（loginMethod = 'test' または openIdが 'test_' prefix）

  // 予約の削除
  await db.delete(reservations).where(
    sql`${reservations.userId} IN (
      SELECT id FROM users WHERE login_method = 'test' OR open_id LIKE 'test_%'
    )`
  );

  // 動画の削除
  await db.delete(videos).where(
    sql`${videos.userId} IN (
      SELECT id FROM users WHERE login_method = 'test' OR open_id LIKE 'test_%'
    )`
  );

  // テストユーザーの削除
  await db.delete(users).where(
    or(
      eq(users.loginMethod, "test"),
      sql`${users.openId} LIKE 'test_%'`
    )
  );

  // テストテンプレートの削除
  await db.delete(templates).where(
    sql`${templates.id} >= 9900`
  );
}

async function createTestUsers(
  db: ReturnType<typeof drizzle>
): Promise<Map<string, number>> {
  const userIdMap = new Map<string, number>();

  for (const [key, userData] of Object.entries(TEST_USERS)) {
    const [result] = await db
      .insert(users)
      .values({
        openId: userData.openId,
        name: userData.name,
        email: userData.email,
        loginMethod: userData.loginMethod,
        role: userData.role,
      })
      .returning({ id: users.id });

    userIdMap.set(key, result.id);
    console.log(`    Created user: ${userData.name} (id: ${result.id})`);
  }

  return userIdMap;
}

async function createTestTemplates(db: ReturnType<typeof drizzle>) {
  for (const template of TEST_TEMPLATES) {
    await db.insert(templates).values(template);
  }
  console.log(`    Created ${TEST_TEMPLATES.length} test templates`);
}

async function createTestData(
  db: ReturnType<typeof drizzle>,
  userIdMap: Map<string, number>
) {
  // userWithVideos用の動画を作成
  const userWithVideosId = userIdMap.get("userWithVideos");
  if (userWithVideosId) {
    const testVideos = createTestVideos(userWithVideosId);
    const insertedVideos = await db.insert(videos).values(testVideos).returning({ id: videos.id });
    console.log(`    Created ${insertedVideos.length} test videos for userWithVideos`);
  }

  // userWithReservations用の動画と予約を作成
  const userWithReservationsId = userIdMap.get("userWithReservations");
  if (userWithReservationsId) {
    // 動画を作成
    const [video] = await db
      .insert(videos)
      .values({
        userId: userWithReservationsId,
        template1Id: 9901,
        template2Id: 9902,
        template3Id: 9903,
        videoUrl: "https://example.com/test-video-reserved.mp4",
        videoType: "free",
        status: "completed",
      })
      .returning({ id: videos.id });

    // 予約を作成
    const testReservations = createTestReservations(
      userWithReservationsId,
      video.id
    );
    await db.insert(reservations).values(testReservations);
    console.log(`    Created test reservations for userWithReservations`);
  }
}

async function generateStorageStates(config: FullConfig) {
  const browser = await chromium.launch();

  // .authディレクトリを作成
  const authDir = path.join(process.cwd(), ".auth");
  await fs.mkdir(authDir, { recursive: true });

  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";
  const domain = new URL(baseURL).hostname;

  for (const [key, userData] of Object.entries(TEST_USERS)) {
    const storagePath =
      STORAGE_STATE_PATHS[key as keyof typeof STORAGE_STATE_PATHS];
    if (!storagePath) continue;

    const context = await browser.newContext();

    // JWTトークンを生成
    const token = await createTestSessionToken(userData.openId, userData.name);

    // Cookieを設定
    await context.addCookies([
      {
        name: "app_session_id",
        value: token,
        domain,
        path: "/",
        httpOnly: true,
        secure: false, // ローカルテストではfalse
        sameSite: "Lax",
      },
    ]);

    // Storage Stateを保存
    await context.storageState({ path: storagePath });
    await context.close();

    console.log(`    Generated storage state: ${storagePath}`);
  }

  await browser.close();
}

export default globalSetup;
