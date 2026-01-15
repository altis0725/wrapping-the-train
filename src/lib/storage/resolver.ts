import type { Template } from "@/db/schema";
import { generatePresignedUrl } from "./presigned";
import { isStorageConfigured } from "./client";

/**
 * サムネイルの storageKey から URL を生成
 *
 * @param storageKey - サムネイルの storageKey (thumbnails/... 形式)
 * @returns Presigned URL
 */
export async function getThumbnailUrl(storageKey: string): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error("ストレージが設定されていません");
  }

  // セキュリティ: サムネイルプレフィックスのバリデーション
  // 任意のオブジェクトへの署名発行を防ぐ
  if (!storageKey.startsWith("thumbnails/")) {
    throw new Error("無効なサムネイルキーです");
  }

  return generatePresignedUrl(storageKey, 60 * 60 * 24); // 24時間有効
}

/**
 * テンプレートの動画 URL を解決
 *
 * - storageKey がある場合: Presigned URL を生成
 * - videoUrl がある場合: そのまま返す（後方互換性）
 *
 * @param template - テンプレートオブジェクト
 * @returns 動画にアクセス可能な URL
 */
export async function getTemplateVideoUrl(
  template: Pick<Template, "videoUrl"> & { storageKey?: string | null }
): Promise<string> {
  // storageKey がある場合は Presigned URL を生成
  if (template.storageKey && isStorageConfigured()) {
    try {
      return await generatePresignedUrl(template.storageKey);
    } catch (error) {
      console.error(
        `[getTemplateVideoUrl] Presigned URL 生成失敗: ${template.storageKey}`,
        error
      );
      // フォールバック: videoUrl があればそちらを使用
      if (template.videoUrl) {
        return template.videoUrl;
      }
      throw error;
    }
  }

  // 後方互換性: videoUrl を返す
  if (template.videoUrl) {
    return template.videoUrl;
  }

  throw new Error("テンプレートに有効な動画URLが設定されていません");
}
