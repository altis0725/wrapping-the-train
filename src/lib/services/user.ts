import { db } from "@/db";
import { users, type User, type NewUser } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminOpenId } from "@/lib/auth/admin";

export interface UpsertUserData {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
}

/**
 * ユーザーを作成または更新
 */
export async function upsertUser(data: UpsertUserData): Promise<User> {
  const now = new Date();

  // 管理者の場合は自動的にadminロールを付与（複数管理者対応）
  const role = isAdminOpenId(data.openId) ? "admin" : "user";

  const values: NewUser = {
    openId: data.openId,
    name: data.name ?? null,
    email: data.email ?? null,
    loginMethod: data.loginMethod ?? "line",
    role,
    lastSignedIn: now,
    updatedAt: now,
  };

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.openId,
      set: {
        name: data.name ?? undefined,
        email: data.email ?? undefined,
        loginMethod: data.loginMethod ?? undefined,
        lastSignedIn: now,
        updatedAt: now,
        // 管理者の場合はロールも更新（複数管理者対応）
        ...(isAdminOpenId(data.openId) && { role: "admin" }),
      },
    });

  const user = await getUserByOpenId(data.openId);
  if (!user) {
    throw new Error("Failed to create/update user");
  }

  return user;
}

/**
 * openIdでユーザーを取得
 */
export async function getUserByOpenId(openId: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * ユーザーがadminか判定（複数管理者対応）
 */
export async function isAdmin(openId: string): Promise<boolean> {
  // 環境変数の管理者IDと一致する場合
  if (isAdminOpenId(openId)) {
    return true;
  }

  // DBのロールをチェック
  const user = await getUserByOpenId(openId);
  return user?.role === "admin";
}
