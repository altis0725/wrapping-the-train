/**
 * 開発環境用ログインエンドポイント
 *
 * ⚠️ 開発環境でのみ有効。本番環境では404を返します。
 * ローカル開発時にLINE認証をバイパスしてログインできます。
 *
 * 使い方: http://localhost:3000/api/dev-login
 * 管理者: http://localhost:3000/api/dev-login?admin=1
 */
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth/session";
import { upsertUser } from "@/lib/services/user";

const DEV_USER = {
  openId: "dev_user_001",
  name: "Dev User",
  loginMethod: "test",
} as const;

const DEV_ADMIN = {
  openId: "dev_admin_001",
  name: "Dev Admin",
  loginMethod: "test",
} as const;

export async function GET(request: NextRequest) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = request.nextUrl.searchParams.get("admin") === "1";
  const userData = isAdmin ? DEV_ADMIN : DEV_USER;

  try {
    // ユーザーを作成/更新
    await upsertUser(userData);

    // セッショントークンを作成
    const token = await createSessionToken(userData.openId, userData.name);

    // Cookieを設定してリダイレクト
    const response = NextResponse.redirect(
      new URL("/mypage", request.nextUrl.origin)
    );

    response.cookies.set("app_session_id", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30日
    });

    return response;
  } catch (error) {
    console.error("[dev-login] Error:", error);
    return NextResponse.json(
      { error: "Failed to create dev session", details: String(error) },
      { status: 500 }
    );
  }
}
