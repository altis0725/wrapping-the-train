/**
 * Shotstack API連携
 *
 * ルママスク合成を使用して3つのテンプレート動画を1つに合成
 * - Track1 (Top): 車輪 + mask_wheel_inverted_v2.png
 * - Track2 (Middle): 窓 + mask_window_inverted_v2.png
 * - Track3 (Bottom): 背景 + mask_body_inverted_v2.png
 *
 * Shotstackのルママスク仕様:
 * - 白 = 透明（穴が開く）→ 下のレイヤーが見える
 * - 黒 = 不透明（残る）→ そのトラックの動画が見える
 *
 * したがってマスク画像は「見せたい部分を黒、透過させたい部分を白」で作成
 * → mask_wheel_inverted_v2.png, mask_window_inverted_v2.png, mask_body_inverted_v2.png を使用
 */

const SHOTSTACK_STAGE_URL = "https://api.shotstack.io/stage";
const SHOTSTACK_PROD_URL = "https://api.shotstack.io/v1";

// セグメントの固定長（秒）- 各テンプレートは10秒
const SEGMENT_DURATION = 10;
// セグメント数
const SEGMENT_COUNT = 3;

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

function getMaskUrl(type: "window" | "wheel" | "body"): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  // 反転済みマスク画像を使用（白黒反転版）
  // v2: 2026-01-16 キャッシュ無効化のためリネーム
  const maskFileName = `mask_${type}_inverted_v2.png`;

  // NEXT_PUBLIC_APP_URLが設定されていない場合（テスト環境など）は
  // GitHub Raw URLを使用する
  if (!baseUrl || baseUrl === "http://localhost:3000") {
    return `${GITHUB_RAW_BASE_URL}/${maskFileName}`;
  }

  return `${baseUrl}/img/${maskFileName}`;
}

/**
 * セグメント（10秒区間）の入力型
 */
export interface VideoSegment {
  background: string;
  window: string;
  wheel: string;
}

/**
 * 3セグメント（30秒）のテンプレート動画をルママスク合成
 * @param segments 3セグメント分のURL配列
 * @param environment 環境 (stage or production)
 * @param resolution 解像度 (デフォルト: sd)
 */
export async function mergeVideos(
  segments: VideoSegment[],
  environment: ShotstackEnvironment = "stage",
  resolution: ShotstackResolution = "sd"
): Promise<ShotstackRenderResult> {
  if (segments.length !== SEGMENT_COUNT) {
    throw new Error(`セグメント数は${SEGMENT_COUNT}である必要があります`);
  }

  const apiKey = getApiKey(environment);
  const baseUrl = getBaseUrl(environment);

  // 各トラックに3セグメント分のクリップを生成
  const wheelClips: Array<{ asset: { type: string; src: string }; start: number; length: number }> = [];
  const windowClips: Array<{ asset: { type: string; src: string }; start: number; length: number }> = [];
  const backgroundClips: Array<{ asset: { type: string; src: string }; start: number; length: number }> = [];

  segments.forEach((segment, index) => {
    const startTime = index * SEGMENT_DURATION;

    // 車輪トラック（ルママスク + 動画）
    wheelClips.push({
      asset: { type: "luma", src: getMaskUrl("wheel") },
      start: startTime,
      length: SEGMENT_DURATION,
    });
    wheelClips.push({
      asset: { type: "video", src: segment.wheel },
      start: startTime,
      length: SEGMENT_DURATION,
    });

    // 窓トラック（ルママスク + 動画）
    windowClips.push({
      asset: { type: "luma", src: getMaskUrl("window") },
      start: startTime,
      length: SEGMENT_DURATION,
    });
    windowClips.push({
      asset: { type: "video", src: segment.window },
      start: startTime,
      length: SEGMENT_DURATION,
    });

    // 背景トラック（ルママスク + 動画）
    backgroundClips.push({
      asset: { type: "luma", src: getMaskUrl("body") },
      start: startTime,
      length: SEGMENT_DURATION,
    });
    backgroundClips.push({
      asset: { type: "video", src: segment.background },
      start: startTime,
      length: SEGMENT_DURATION,
    });
  });

  // 3トラック構造: 同一トラック内に luma + video を配置
  // Shotstack の仕様に従い、マスクは同一トラック内のクリップに適用される
  const tracks = [
    // Top Layer: Wheel with Luma Mask（3セグメント分）
    { clips: wheelClips },
    // Middle Layer: Window with Luma Mask（3セグメント分）
    { clips: windowClips },
    // Bottom Layer: Background（3セグメント分）
    { clips: backgroundClips },
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
