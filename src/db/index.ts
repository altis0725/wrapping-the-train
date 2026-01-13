import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Connection pool for server-side operations
const client = postgres(connectionString, {
  max: 20, // 最大コネクション数
  idle_timeout: 20, // アイドルタイムアウト（秒）
  connect_timeout: 10, // 接続タイムアウト（秒）
  prepare: false, // Vercel Serverless では false 推奨
});
export const db = drizzle(client, { schema });

export * from "./schema";
