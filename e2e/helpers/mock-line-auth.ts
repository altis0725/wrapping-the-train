/**
 * LINE認証のMock化ヘルパー
 *
 * page.route() を使用してLINE OAuthエンドポイントをインターセプトし、
 * 外部ネットワーク依存なしでローカルテストを可能にします。
 */

import { Page } from "@playwright/test";

export interface MockUser {
  openId: string;
  name: string;
}

/**
 * LINE認証をモック化
 *
 * 以下のエンドポイントをインターセプト:
 * - https://access.line.me/oauth2/v2.1/authorize (認可)
 * - https://api.line.me/oauth2/v2.1/token (トークン取得)
 * - https://api.line.me/v2/profile (プロフィール取得)
 *
 * @param page - Playwrightのページオブジェクト
 * @param mockUser - モック用ユーザー情報
 */
export async function mockLineAuth(page: Page, mockUser: MockUser) {
  // LINE認可エンドポイントをインターセプト
  await page.route(
    "https://access.line.me/oauth2/v2.1/authorize**",
    async (route) => {
      const url = new URL(route.request().url());
      const redirectUri = url.searchParams.get("redirect_uri");
      const state = url.searchParams.get("state");

      if (!redirectUri) {
        await route.abort();
        return;
      }

      // ダミーのcodeでコールバックにリダイレクト
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set(
        "code",
        `mock_auth_code_${mockUser.openId}_${Date.now()}`
      );
      if (state) {
        callbackUrl.searchParams.set("state", state);
      }

      await route.fulfill({
        status: 302,
        headers: {
          Location: callbackUrl.toString(),
        },
      });
    }
  );

  // LINEトークンエンドポイントをインターセプト
  await page.route("https://api.line.me/oauth2/v2.1/token", async (route) => {
    const mockIdToken = createMockIdToken(mockUser);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: `mock_access_token_${mockUser.openId}`,
        token_type: "Bearer",
        expires_in: 2592000, // 30日
        refresh_token: `mock_refresh_token_${mockUser.openId}`,
        scope: "profile openid",
        id_token: mockIdToken,
      }),
    });
  });

  // LINEプロフィールエンドポイントをインターセプト
  await page.route("https://api.line.me/v2/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        userId: mockUser.openId,
        displayName: mockUser.name,
        pictureUrl: "https://example.com/mock-avatar.jpg",
        statusMessage: "Test user",
      }),
    });
  });

  // LINEトークン検証エンドポイントをインターセプト
  await page.route("https://api.line.me/oauth2/v2.1/verify**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scope: "profile openid",
        client_id: "mock_client_id",
        expires_in: 2591999,
      }),
    });
  });
}

/**
 * モックIDトークンを生成
 *
 * 注意: これは実際のJWTではなく、テスト用のダミー文字列です。
 * アプリ側ではprofile APIの結果を使用するため、
 * IDトークンの検証はスキップされる想定です。
 */
function createMockIdToken(mockUser: MockUser): string {
  // Base64エンコードされたJWTっぽい構造（署名なし）
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
    "base64url"
  );

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: "https://access.line.me",
      sub: mockUser.openId,
      aud: "mock_client_id",
      exp: now + 3600,
      iat: now,
      name: mockUser.name,
    })
  ).toString("base64url");

  // 署名部分はダミー
  const signature = "mock_signature";

  return `${header}.${payload}.${signature}`;
}

/**
 * Shotstack APIをモック化
 *
 * 動画レンダリングのAPIリクエストをインターセプトします。
 */
export async function mockShotstackApi(page: Page) {
  // Render API
  await page.route("https://api.shotstack.io/v1/render", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Created",
        response: {
          id: `mock_render_${Date.now()}`,
          owner: "mock_owner",
          status: "queued",
        },
      }),
    });
  });

  // Status API
  await page.route(
    "https://api.shotstack.io/v1/render/**/status",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "OK",
          response: {
            status: "done",
            url: "https://cdn.shotstack.io/mock-output.mp4",
          },
        }),
      });
    }
  );
}

/**
 * Stripe APIをモック化
 *
 * 決済関連のAPIリクエストをインターセプトします。
 */
export async function mockStripeApi(page: Page) {
  // Checkout Session作成
  await page.route(
    "https://api.stripe.com/v1/checkout/sessions",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: `cs_test_${Date.now()}`,
          object: "checkout.session",
          url: "http://localhost:3000/mock-stripe-checkout",
          status: "open",
          payment_status: "unpaid",
        }),
      });
    }
  );

  // Payment Intent取得
  await page.route(
    /https:\/\/api\.stripe\.com\/v1\/payment_intents\/.*/,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: `pi_test_${Date.now()}`,
          object: "payment_intent",
          status: "succeeded",
          amount: 3000,
          currency: "jpy",
        }),
      });
    }
  );
}
