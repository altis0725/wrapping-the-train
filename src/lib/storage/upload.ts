import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getStorageClient, getBucketName } from "./client";

// 許可するファイルタイプ
const ALLOWED_MIME_TYPES = ["video/mp4", "video/quicktime"];
const ALLOWED_EXTENSIONS = [".mp4", ".mov"];

// 最大ファイルサイズ: 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024;

export interface UploadResult {
  success: boolean;
  storageKey?: string;
  error?: string;
}

/**
 * テンプレート動画をストレージにアップロード
 */
export async function uploadTemplateVideo(
  file: File,
  category: number,
  templateId: number
): Promise<UploadResult> {
  // バリデーション
  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // ストレージキーを生成
  const extension = getFileExtension(file.name);
  const timestamp = Date.now();
  const storageKey = `templates/${category}/${templateId}/${timestamp}${extension}`;

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
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // サイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`,
    };
  }

  // MIME タイプチェック
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `許可されていないファイル形式です（許可: ${ALLOWED_EXTENSIONS.join(", ")}）`,
    };
  }

  // 拡張子チェック
  const extension = getFileExtension(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `許可されていない拡張子です（許可: ${ALLOWED_EXTENSIONS.join(", ")}）`,
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
