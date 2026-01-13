import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { ENV } from "@/lib/auth/constants";

export async function GET() {
  try {
    await clearSessionCookie();
    return NextResponse.redirect(`${ENV.appUrl}/login`);
  } catch (error) {
    console.error("[Auth] Logout failed:", error);
    return NextResponse.redirect(`${ENV.appUrl}/login`);
  }
}

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Auth] Logout failed:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
