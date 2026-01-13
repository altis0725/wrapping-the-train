import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  SESSION_ROTATION_THRESHOLD_MS,
  ENV,
  getCookieOptions,
} from "./constants";
import { getUserByOpenId } from "@/lib/services/user";
import type { User } from "@/db/schema";

export interface SessionPayload {
  openId: string;
  name: string;
  iat: number;
  exp: number;
}

function getSecretKey() {
  const secret = ENV.jwtSecret;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

/**
 * セッショントークンを作成
 */
export async function createSessionToken(
  openId: string,
  name: string
): Promise<string> {
  const secretKey = getSecretKey();
  const now = Date.now();
  const expiresAt = Math.floor((now + SESSION_MAX_AGE_MS) / 1000);

  return new SignJWT({
    openId,
    name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey);
}

/**
 * セッショントークンを検証
 */
export async function verifySession(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    const { openId, name, iat, exp } = payload as Record<string, unknown>;

    if (
      typeof openId !== "string" ||
      typeof name !== "string" ||
      typeof iat !== "number" ||
      typeof exp !== "number"
    ) {
      return null;
    }

    return { openId, name, iat, exp };
  } catch {
    return null;
  }
}

/**
 * トークンローテーションが必要か判定
 */
export function shouldRotateToken(payload: SessionPayload): boolean {
  const expiresAt = payload.exp * 1000;
  const remaining = expiresAt - Date.now();
  return remaining < SESSION_ROTATION_THRESHOLD_MS;
}

/**
 * 現在のユーザーを取得
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  const session = await verifySession(token);
  if (!session) {
    return null;
  }

  const user = await getUserByOpenId(session.openId);
  return user;
}

/**
 * セッションCookieを設定
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, getCookieOptions(SESSION_MAX_AGE_MS / 1000));
}

/**
 * セッションCookieを削除
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
