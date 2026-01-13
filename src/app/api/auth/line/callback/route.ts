import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLineToken, getLineProfile, verifyLineIdToken } from "@/lib/auth/line";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { upsertUser } from "@/lib/services/user";
import {
  STATE_COOKIE_NAME,
  REDIRECT_COOKIE_NAME,
  ENV,
} from "@/lib/auth/constants";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // エラーチェック
    if (error) {
      console.error("[Auth] LINE auth error:", error);
      return NextResponse.redirect(`${ENV.appUrl}/login?error=${error}`);
    }

    if (!code || !state) {
      console.error("[Auth] Missing code or state");
      return NextResponse.redirect(`${ENV.appUrl}/login?error=invalid_request`);
    }

    // State検証 (CSRF対策)
    const cookieStore = await cookies();
    const storedState = cookieStore.get(STATE_COOKIE_NAME)?.value;
    const returnTo = cookieStore.get(REDIRECT_COOKIE_NAME)?.value ?? "/mypage";

    if (!storedState || state !== storedState) {
      console.error("[Auth] State mismatch");
      return NextResponse.redirect(`${ENV.appUrl}/login?error=invalid_state`);
    }

    // State Cookieを削除
    cookieStore.delete(STATE_COOKIE_NAME);
    cookieStore.delete(REDIRECT_COOKIE_NAME);

    // トークン交換
    const redirectUri = `${ENV.appUrl}/api/auth/line/callback`;
    const tokenData = await getLineToken(code, redirectUri);

    // ID Token検証
    const idTokenPayload = await verifyLineIdToken(tokenData.id_token);

    // プロフィール取得
    const profile = await getLineProfile(tokenData.access_token);

    // ユーザー作成/更新
    const user = await upsertUser({
      openId: profile.userId,
      name: profile.displayName,
      email: idTokenPayload.email ?? null,
      loginMethod: "line",
    });

    // セッショントークン作成
    const sessionToken = await createSessionToken(
      user.openId,
      user.name ?? profile.displayName
    );

    // Cookie設定
    await setSessionCookie(sessionToken);

    console.log("[Auth] Login successful:", user.id);

    // リダイレクト
    return NextResponse.redirect(`${ENV.appUrl}${returnTo}`);
  } catch (error) {
    console.error("[Auth] Callback failed:", error);
    return NextResponse.redirect(`${ENV.appUrl}/login?error=auth_failed`);
  }
}
