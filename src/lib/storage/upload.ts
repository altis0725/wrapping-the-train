import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getStorageClient, getBucketName } from "./client";
import { TEMPLATE_CATEGORY } from "@/db/schema";

// 許可するファイルタイプ（動画）
const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime"];
const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov"];

// 許可するファイルタイプ（音楽）
const ALLOWED_MUSIC_MIME_TYPES = [
  "audio/mpeg", // MP3
  "audio/wav", // WAV
  "audio/mp4", // M4A/AAC
  "audio/x-m4a", // M4A（別MIMEタイプ）
];
const ALLOWED_MUSIC_EXTENSIONS = [".mp3", ".wav", ".m4a"];

// 最大ファイルサイズ: 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024;

export interface UploadResult {
  success: boolean;
  storageKey?: string;
  error?: string;
}

/**
 * テンプレートファイル（動画または音楽）をストレージにアップロード
 */
export async function uploadTemplateVideo(
  file: File,
  category: number,
  templateId: number
): Promise<UploadResult> {
  const isMusic = category === TEMPLATE_CATEGORY.MUSIC;

  // バリデーション（カテゴリに応じて動画/音楽を判定）
  const validation = validateFile(file, isMusic);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // ストレージキーを生成
  // 音楽: music/{templateId}/{timestamp}{ext}
  // 動画: templates/{category}/{templateId}/{timestamp}{ext}
  const extension = getFileExtension(file.name);
  const timestamp = Date.now();
  const storageKey = isMusic
    ? `music/${templateId}/${timestamp}${extension}`
    : `templates/${category}/${templateId}/${timestamp}${extension}`;

  try {
    const client = getStorageClient();
    const bucketName = getBucketName();

    // ファイルを ArrayBuffer に変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // S3 にアップロード
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
        Body: buffer,
        ContentType: file.type,
      })
    );

    return { success: true, storageKey };
  } catch (error) {
    console.error("[uploadTemplateVideo] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "アップロードに失敗しました",
    };
  }
}

/**
 * ストレージからファイルを削除
 */
export async function deleteStorageFile(
  storageKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getStorageClient();
    const bucketName = getBucketName();

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
      })
    );

    return { success: true };
  } catch (error) {
    console.error("[deleteStorageFile] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "削除に失敗しました",
    };
  }
}

/**
 * ファイルバリデーション
 * @param file - アップロードするファイル
 * @param isMusic - 音楽ファイルかどうか
 */
function validateFile(
  file: File,
  isMusic: boolean
): { valid: boolean; error?: string } {
  const allowedMimeTypes = isMusic
    ? ALLOWED_MUSIC_MIME_TYPES
    : ALLOWED_VIDEO_MIME_TYPES;
  const allowedExtensions = isMusic
    ? ALLOWED_MUSIC_EXTENSIONS
    : ALLOWED_VIDEO_EXTENSIONS;
  const formatLabel = isMusic ? "音楽" : "動画";

  // サイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`,
    };
  }

  // MIME タイプチェック
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `許可されていない${formatLabel}形式です（許可: ${allowedExtensions.join(", ")}）`,
    };
  }

  // 拡張子チェック
  const extension = getFileExtension(file.name).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `許可されていない拡張子です（許可: ${allowedExtensions.join(", ")}）`,
    };
  }

  return { valid: true };
}

/**
 * ファイル名から拡張子を取得
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.substring(lastDot);
}
