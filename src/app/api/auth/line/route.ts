import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { getLineAuthUrl } from "@/lib/auth/line";
import {
  STATE_COOKIE_NAME,
  REDIRECT_COOKIE_NAME,
  STATE_MAX_AGE_SECONDS,
  ENV,
  getCookieOptions,
} from "@/lib/auth/constants";

export async function GET(request: NextRequest) {
  try {
    // CSRF対策用のstate生成
    const state = nanoid();

    // コールバックURL
    const redirectUri = `${ENV.appUrl}/api/auth/line/callback`;

    // ログイン後のリダイレクト先を保存
    const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/mypage";

    // Cookieに保存
    const cookieStore = await cookies();
    cookieStore.set(
      STATE_COOKIE_NAME,
      state,
      getCookieOptions(STATE_MAX_AGE_SECONDS)
    );
    cookieStore.set(
      REDIRECT_COOKIE_NAME,
      returnTo,
      getCookieOptions(STATE_MAX_AGE_SECONDS)
    );

    // LINE認証URLにリダイレクト
    const authUrl = getLineAuthUrl(state, redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[Auth] LINE auth start failed:", error);
    return NextResponse.redirect(
      `${ENV.appUrl}/login?error=auth_failed`
    );
  }
}
