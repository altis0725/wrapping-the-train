// Cookie設定
export const COOKIE_NAME = "app_session_id";
export const STATE_COOKIE_NAME = "line_auth_state";
export const REDIRECT_COOKIE_NAME = "line_redirect_uri";

// JWT有効期限
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30日
export const SESSION_ROTATION_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 7; // 7日

// State Cookie有効期限
export const STATE_MAX_AGE_SECONDS = 300; // 5分

// LINE API URLs
export const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
export const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
export const LINE_PROFILE_URL = "https://api.line.me/v2/profile";
export const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

// 環境変数
export const ENV = {
  get lineChannelId() {
    return process.env.LINE_CHANNEL_ID ?? "";
  },
  get lineChannelSecret() {
    return process.env.LINE_CHANNEL_SECRET ?? "";
  },
  get jwtSecret() {
    return process.env.JWT_SECRET ?? "";
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  get ownerOpenId() {
    return process.env.OWNER_OPEN_ID ?? "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};

// Cookie共通オプション
export function getCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: "lax" as const,
    path: "/",
    ...(maxAge !== undefined && { maxAge }),
  };
}
