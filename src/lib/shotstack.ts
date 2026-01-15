/**
 * Shotstack API連携
 *
 * ルママスク合成を使用して3つのテンプレート動画を1つに合成
 * - Track1 (Top): 車輪 + mask_wheel.png
 * - Track2 (Middle): 窓 + mask_window.png
 * - Track3 (Bottom): 背景
 *
 * Shotstackのルママスク仕様:
 * - 白 = 透明（穴が開く）→ 下のレイヤーが見える
 * - 黒 = 不透明（残る）→ そのトラックの動画が見える
 *
 * したがってマスク画像は「見せたい部分を黒、透過させたい部分を白」で作成
 * → mask_wheel_inverted.png, mask_window_inverted.png を使用
 */

const SHOTSTACK_STAGE_URL = "https://api.shotstack.io/stage";
const SHOTSTACK_PROD_URL = "https://api.shotstack.io/v1";

// 動画の固定長（秒）- テンプレートは10秒
const VIDEO_DURATION = 10;

// テスト環境用のGitHub Raw URL（マスク画像）
// mainブランチの公開URLを使用（Shotstackからアクセス可能）
const GITHUB_RAW_BASE_URL =
  "https://raw.githubusercontent.com/altis0725/wrapping-the-train/main/public/img";

export type ShotstackEnvironment = "stage" | "production";

export type ShotstackRenderStatus =
  | "queued"
  | "fetching"
  | "rendering"
  | "saving"
  | "done"
  | "failed"
  | "preprocessing";

export interface ShotstackRenderResult {
  renderId: string;
}

export interface ShotstackStatusResult {
  status: ShotstackRenderStatus;
  url?: string;
  error?: string;
}

// Shotstack 解像度オプション
export type ShotstackResolution = "preview" | "mobile" | "sd" | "hd" | "1080";

function getApiKey(environment: ShotstackEnvironment): string {
  const key =
    environment === "production"
      ? process.env.SHOTSTACK_API_KEY_PRODUCTION
      : process.env.SHOTSTACK_API_KEY_SANDBOX;

  if (!key) {
    throw new Error(
      `Shotstack API key not configured for ${environment} environment`
    );
  }

  return key;
}

function getBaseUrl(environment: ShotstackEnvironment): string {
  return environment === "production" ? SHOTSTACK_PROD_URL : SHOTSTACK_STAGE_URL;
}

function getMaskUrl(type: "window" | "wheel"): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  // 反転済みマスク画像を使用（白黒反転版）
  const maskFileName = `mask_${type}_inverted.png`;

  // NEXT_PUBLIC_APP_URLが設定されていない場合（テスト環境など）は
  // GitHub Raw URLを使用する
  if (!baseUrl || baseUrl === "http://localhost:3000") {
    return `${GITHUB_RAW_BASE_URL}/${maskFileName}`;
  }

  return `${baseUrl}/img/${maskFileName}`;
}

/**
 * 3つのテンプレート動画をルママスク合成
 * @param backgroundUrl 背景動画のURL
 * @param windowUrl 窓動画のURL
 * @param wheelUrl 車輪動画のURL
 * @param environment 環境 (stage or production)
 * @param resolution 解像度 (デフォルト: sd)
 */
export async function mergeVideos(
  backgroundUrl: string,
  windowUrl: string,
  wheelUrl: string,
  environment: ShotstackEnvironment = "stage",
  resolution: ShotstackResolution = "sd"
): Promise<ShotstackRenderResult> {
  const apiKey = getApiKey(environment);
  const baseUrl = getBaseUrl(environment);

  // 3トラック構造: 同一トラック内に luma + video を配置
  // Shotstack の仕様に従い、マスクは同一トラック内のクリップに適用される
  const tracks = [
    // Top Layer: Wheel with Luma Mask
    {
      clips: [
        {
          asset: {
            type: "luma",
            src: getMaskUrl("wheel"),
          },
          start: 0,
          length: VIDEO_DURATION,
        },
        {
          asset: {
            type: "video",
            src: wheelUrl,
          },
          start: 0,
          length: VIDEO_DURATION,
        },
      ],
    },
    // Middle Layer: Window with Luma Mask
    {
      clips: [
        {
          asset: {
            type: "luma",
            src: getMaskUrl("window"),
          },
          start: 0,
          length: VIDEO_DURATION,
        },
        {
          asset: {
            type: "video",
            src: windowUrl,
          },
          start: 0,
          length: VIDEO_DURATION,
        },
      ],
    },
    // Bottom Layer: Background
    {
      clips: [
        {
          asset: {
            type: "video",
            src: backgroundUrl,
          },
          start: 0,
          length: VIDEO_DURATION,
        },
      ],
    },
  ];

  const renderPayload = {
    timeline: {
      background: "#000000",
      tracks,
    },
    output: {
      format: "mp4",
      resolution,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${baseUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(renderPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Shotstack render request failed: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();
    const renderId = data.response?.id;

    if (!renderId) {
      throw new Error("Failed to get render ID from Shotstack response");
    }

    console.log(
      `[Shotstack] Render submitted successfully (${environment}, ${resolution}):`,
      renderId
    );
    return { renderId };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Shotstack render request timed out");
    }
    throw error;
  }
}

/**
 * レンダリングステータスを確認
 */
export async function getRenderStatus(
  renderId: string,
  environment: ShotstackEnvironment = "stage"
): Promise<ShotstackStatusResult> {
  const apiKey = getApiKey(environment);
  const baseUrl = getBaseUrl(environment);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${baseUrl}/render/${renderId}`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Shotstack status request failed: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();

    return {
      status: data.response?.status || "failed",
      url: data.response?.url,
      error: data.response?.error,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Shotstack status request timed out");
    }
    throw error;
  }
}

/**
 * レンダリング完了までポーリング
 * @param renderId Shotstack render ID
 * @param environment 環境 (stage or production)
 * @param intervalMs ポーリング間隔（ミリ秒）
 * @param maxAttempts 最大試行回数
 * @returns 完了時のURL または エラー
 */
export async function pollRenderStatus(
  renderId: string,
  environment: ShotstackEnvironment = "stage",
  intervalMs: number = 5000,
  maxAttempts: number = 120 // 10分 = 5秒 × 120回
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const status = await getRenderStatus(renderId, environment);

      if (status.status === "done" && status.url) {
        return { success: true, url: status.url };
      }

      if (status.status === "failed") {
        return {
          success: false,
          error: status.error || "Render failed without specific error",
        };
      }

      // まだ処理中 - 待機
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      // ネットワークエラーなどの一時的な問題は続行
      console.error(
        `[Shotstack] Polling error (attempt ${attempt + 1}):`,
        error
      );
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return { success: false, error: "Render timed out" };
}
