/**
 * Shotstack API連携
 *
 * ルママスク合成を使用して3つのテンプレート動画を1つに合成
 * - Track1 (Top): 車輪 + mask_wheel.png
 * - Track2 (Middle): 窓 + mask_window.png
 * - Track3 (Bottom): 背景
 */

const SHOTSTACK_STAGE_URL = "https://api.shotstack.io/stage";
const SHOTSTACK_PROD_URL = "https://api.shotstack.io/v1";

// 動画の固定長（秒）
const VIDEO_DURATION = 30;

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
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  return `${baseUrl}/img/mask_${type}.png`;
}

/**
 * 3つのテンプレート動画をルママスク合成
 */
export async function mergeVideos(
  backgroundUrl: string,
  windowUrl: string,
  wheelUrl: string,
  environment: ShotstackEnvironment = "stage"
): Promise<ShotstackRenderResult> {
  const apiKey = getApiKey(environment);
  const baseUrl = getBaseUrl(environment);

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
      resolution: "sd",
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
      `[Shotstack] Render submitted successfully (${environment}):`,
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
