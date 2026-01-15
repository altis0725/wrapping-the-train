/**
 * デバッグ用認証エンドポイント
 *
 * ⚠️ 開発環境でのみ有効。本番環境では404を返します。
 * E2Eテストやローカル開発時の認証デバッグに使用。
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getUserByOpenId } from "@/lib/services/user";

export async function GET(request: NextRequest) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const jwtSecret = process.env.JWT_SECRET ?? "";
  const adminOpenIds = (
    process.env.ADMIN_OPEN_IDS ?? process.env.OWNER_OPEN_ID ?? ""
  )
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const token = request.cookies.get("app_session_id")?.value;

  const debugInfo: Record<string, unknown> = {
    jwtSecretLength: jwtSecret.length,
    jwtSecretFirst10: jwtSecret.substring(0, 10),
    adminOpenIds,
    databaseUrlFirst50: databaseUrl.substring(0, 50),
    tokenReceived: !!token,
    tokenFirst50: token?.substring(0, 50) ?? null,
  };

  if (token && jwtSecret.length >= 32) {
    try {
      const secretKey = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(token, secretKey, {
        algorithms: ["HS256"],
      });
      debugInfo.verificationSuccess = true;
      debugInfo.payload = payload;
      debugInfo.isAdmin = adminOpenIds.includes(payload.openId as string);

      // Check if user exists in DB
      const openId = payload.openId as string;
      const user = await getUserByOpenId(openId);
      debugInfo.userFoundInDb = !!user;
      debugInfo.userFromDb = user ? { id: user.id, openId: user.openId, role: user.role } : null;
    } catch (error) {
      debugInfo.verificationSuccess = false;
      debugInfo.error = String(error);
    }
  }

  return NextResponse.json(debugInfo);
}
