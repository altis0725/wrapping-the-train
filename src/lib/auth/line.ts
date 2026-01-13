import {
  LINE_AUTH_URL,
  LINE_TOKEN_URL,
  LINE_PROFILE_URL,
  LINE_VERIFY_URL,
  ENV,
} from "./constants";

export interface LineTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LineIdTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  name?: string;
  picture?: string;
  email?: string;
}

/**
 * LINE認証URLを生成
 */
export function getLineAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: ENV.lineChannelId,
    redirect_uri: redirectUri,
    state: state,
    scope: "profile openid email",
  });
  return `${LINE_AUTH_URL}?${params.toString()}`;
}

/**
 * 認可コードをトークンに交換
 */
export async function getLineToken(
  code: string,
  redirectUri: string
): Promise<LineTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: ENV.lineChannelId,
    client_secret: ENV.lineChannelSecret,
  });

  const response = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LINE token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * アクセストークンでプロフィール取得
 */
export async function getLineProfile(accessToken: string): Promise<LineProfile> {
  const response = await fetch(LINE_PROFILE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LINE profile fetch failed: ${error}`);
  }

  return response.json();
}

/**
 * ID Token検証 (LINE APIで検証)
 */
export async function verifyLineIdToken(
  idToken: string
): Promise<LineIdTokenPayload> {
  const params = new URLSearchParams({
    id_token: idToken,
    client_id: ENV.lineChannelId,
  });

  const response = await fetch(LINE_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LINE ID token verification failed: ${error}`);
  }

  const payload: LineIdTokenPayload = await response.json();

  // 追加検証
  if (payload.iss !== "https://access.line.me") {
    throw new Error("Invalid issuer");
  }
  if (payload.aud !== ENV.lineChannelId) {
    throw new Error("Invalid audience");
  }
  if (payload.exp * 1000 < Date.now()) {
    throw new Error("Token expired");
  }

  return payload;
}
