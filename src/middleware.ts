import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "app_session_id";

// 保護が必要なルート
const PROTECTED_ROUTES = ["/create", "/mypage", "/reservations"];
const ADMIN_ROUTES = ["/admin"];
const PUBLIC_ROUTES = ["/", "/login", "/terms", "/privacy", "/law", "/contact"];

function getSecretKey() {
  const secret = process.env.JWT_SECRET ?? "";
  // session.ts と同じ検証ロジックを適用
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

// 管理者OpenIDの一覧を取得（src/lib/auth/admin.ts と同じロジック）
// Edge Runtimeのため直接インポートせず、同一ロジックを適用
function getAdminOpenIds(): string[] {
  return (process.env.ADMIN_OPEN_IDS ?? process.env.OWNER_OPEN_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

async function verifyToken(token: string): Promise<{ openId: string; name: string } | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    const { openId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || typeof name !== "string") {
      return null;
    }

    return { openId, name };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静的ファイル、API、認証エンドポイントはスキップ
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.includes(".") // 静的ファイル
  ) {
    return NextResponse.next();
  }

  // 公開ルートはスキップ
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // セッション検証
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  // DEBUG: 開発環境でのみデバッグ情報をログ
  if (process.env.NODE_ENV === "development" && pathname.startsWith("/admin")) {
    console.log("[Middleware Debug]", {
      pathname,
      tokenReceived: !!token,
      tokenFirst50: token?.substring(0, 50),
      sessionVerified: !!session,
      sessionOpenId: session?.openId,
      ownerOpenId: process.env.OWNER_OPEN_ID,
    });
  }

  // 保護ルートのチェック
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // 未認証ユーザーをログインページへリダイレクト
  if ((isProtectedRoute || isAdminRoute) && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  // Admin権限チェック (複数管理者対応 - SSOTはsrc/lib/auth/admin.ts と同じロジック)
  // Note: middlewareはEdge Runtimeのため、直接インポートせず同じロジックを適用
  if (isAdminRoute && session) {
    const adminOpenIds = getAdminOpenIds();
    if (!adminOpenIds.includes(session.openId)) {
      // Admin権限なし → ホームにリダイレクト
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
