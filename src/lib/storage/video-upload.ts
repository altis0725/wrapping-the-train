import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getStorageClient, getBucketName, isStorageConfigured } from "./client";

export interface VideoUploadResult {
  success: boolean;
  storageKey?: string;
  error?: string;
}

// Shotstack CDN の許可されたホスト（SSRF対策）
const ALLOWED_HOSTS = [
  "cdn.shotstack.io",
  "d1uej6xx5jo4cd.cloudfront.net", // Shotstack sandbox CDN
  "renders.shotstack.io",
];

// 最大ファイルサイズ（500MB）
const MAX_FILE_SIZE = 500 * 1024 * 1024;

// ダウンロードタイムアウト（120秒 - 大きなファイル対応）
const DOWNLOAD_TIMEOUT_MS = 120000;

/**
 * URLがShotstack CDNの許可されたホストかを検証（SSRF対策）
 */
function isAllowedHost(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // httpsのみ許可
    if (url.protocol !== "https:") {
      return false;
    }

    // 許可されたホストのみ
    return ALLOWED_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

/**
 * レスポンスをストリーミングで読み取り、サイズ制限を強制
 * Content-Lengthが不正確/欠落の場合でもDoS攻撃を防止
 */
async function readResponseWithSizeLimit(
  response: Response,
  maxSize: number
): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalSize += value.length;

      // ストリーミング中にサイズ制限を超えたら即座に中断
      if (totalSize > maxSize) {
        reader.cancel();
        throw new Error(
          `ファイルサイズが大きすぎます: ${Math.round(totalSize / 1024 / 1024)}MB+ (上限: ${Math.round(maxSize / 1024 / 1024)}MB)`
        );
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // チャンクを結合してBufferに変換
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(result);
}

/**
 * 外部URLから動画をダウンロードしてStorage Bucketにアップロード
 *
 * セキュリティ:
 * - Shotstack CDN のホストのみ許可（SSRF対策）
 * - Content-Length 事前チェック（DoS対策）
 * - ストリーミングでサイズ制限を強制（DoS対策）
 * - リダイレクト禁止
 *
 * @param sourceUrl Shotstack CDN のURL（他のホストは拒否）
 * @param userId ユーザーID（ディレクトリ分離用）
 * @param videoId 動画ID（ファイル名用）
 */
export async function downloadAndUploadVideo(
  sourceUrl: string,
  userId: number,
  videoId: number
): Promise<VideoUploadResult> {
  // ストレージ未設定の場合はスキップ
  if (!isStorageConfigured()) {
    console.warn("[downloadAndUploadVideo] Storage not configured, skipping upload");
    return { success: false, error: "ストレージが設定されていません" };
  }

  // SSRF対策: Shotstack CDN のホストのみ許可
  if (!isAllowedHost(sourceUrl)) {
    console.error(`[downloadAndUploadVideo] Blocked non-allowed host: ${sourceUrl}`);
    return { success: false, error: "許可されていないURLです" };
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    // リダイレクト禁止でfetch（SSRF対策）
    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      redirect: "error", // リダイレクト禁止
    });

    // 注意: timeoutはボディ読込完了まで維持（fetch成功後も続く可能性がある）

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    // Content-Length 事前チェック（DoS対策の第一段階）
    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (contentLength > MAX_FILE_SIZE) {
        throw new Error(
          `ファイルサイズが大きすぎます: ${Math.round(contentLength / 1024 / 1024)}MB (上限: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`
        );
      }
    }

    // Content-Type の確認
    const contentType = response.headers.get("content-type") || "video/mp4";

    // ストリーミングでサイズ制限を強制しながら読み取り（DoS対策の第二段階）
    // Content-Lengthが不正確/欠落の場合でも保護される
    // タイムアウトはボディ読込中も有効（AbortController経由）
    const buffer = await readResponseWithSizeLimit(response, MAX_FILE_SIZE);

    // ボディ読込完了後にタイムアウトをクリア
    clearTimeout(timeoutId);
    timeoutId = null;

    // Storage Keyを生成
    const timestamp = Date.now();
    const storageKey = `videos/${userId}/${videoId}/${timestamp}.mp4`;

    // S3にアップロード
    const client = getStorageClient();
    const bucketName = getBucketName();

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
        Body: buffer,
        ContentType: contentType,
      })
    );

    console.log(`[downloadAndUploadVideo] Uploaded successfully: ${storageKey}`);

    return { success: true, storageKey };
  } catch (error) {
    // エラー時もタイムアウトをクリア
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const errorMessage = error instanceof Error ? error.message : "アップロードに失敗しました";
    console.error("[downloadAndUploadVideo] Error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
