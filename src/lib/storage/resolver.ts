import type { Template } from "@/db/schema";
import { generatePresignedUrl } from "./presigned";
import { isStorageConfigured } from "./client";

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
