import type { Template } from "@/db/schema";
import { generatePresignedUrl } from "./presigned";
import { isStorageConfigured } from "./client";
// isValidExternalUrl は getMusicUrl で使用しなくなった（storageKey 必須化）

/**
 * 音楽テンプレートの URL を解決
 *
 * セキュリティ強化: storageKey からの Presigned URL 生成のみ許可
 * 外部 URL フォールバックは SSRF リスクのため無効化
 *
 * @param template - テンプレートオブジェクト（storageKey 必須）
 * @returns 音楽にアクセス可能な Presigned URL
 * @throws storageKey がない場合、または無効な場合はエラー
 */
export async function getMusicUrl(
  template: Pick<Template, "videoUrl"> & { storageKey?: string | null }
): Promise<string> {
  // セキュリティ: storageKey 必須（外部 URL は許可しない）
  if (!template.storageKey) {
    throw new Error(
      "音楽テンプレートには storageKey が必須です（セキュリティ対策）"
    );
  }

  if (!isStorageConfigured()) {
    throw new Error("ストレージが設定されていません");
  }

  // セキュリティ: 音楽プレフィックスのバリデーション
  if (!template.storageKey.startsWith("music/")) {
    console.error(
      `[getMusicUrl] Invalid storage key prefix: ${template.storageKey}`
    );
    throw new Error("無効な音楽キーです（music/ プレフィックスが必要）");
  }

  try {
    return await generatePresignedUrl(template.storageKey, 60 * 60); // 1時間有効
  } catch (error) {
    console.error(
      `[getMusicUrl] Presigned URL 生成失敗: ${template.storageKey}`,
      error
    );
    throw error;
  }
}

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
      // セキュリティ: テンプレートプレフィックスのバリデーション
      if (!template.storageKey.startsWith("templates/")) {
        console.error(
          `[getTemplateVideoUrl] Invalid storage key prefix: ${template.storageKey}`
        );
        // フォールバック
        if (template.videoUrl) {
          return template.videoUrl;
        }
        throw new Error("無効なテンプレートキーです");
      }
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

/**
 * ユーザー生成動画の URL を解決
 *
 * - storageKey がある場合: Presigned URL を生成（永続保存済み）
 * - videoUrl がある場合: そのまま返す（後方互換性、CDN URL）
 *
 * @param video - storageKey と videoUrl を持つオブジェクト
 * @returns 動画にアクセス可能な URL、または null
 */
export async function getVideoUrl(video: {
  storageKey?: string | null;
  videoUrl?: string | null;
}): Promise<string | null> {
  // storageKey がある場合は Presigned URL を生成
  if (video.storageKey && isStorageConfigured()) {
    try {
      // セキュリティ: 厳格なパターンバリデーション
      // 期待されるパターン: videos/{userId}/{videoId}/{timestamp}.mp4
      const storageKeyPattern = /^videos\/\d+\/\d+\/\d+\.mp4$/;
      if (!storageKeyPattern.test(video.storageKey)) {
        console.error(`[getVideoUrl] Invalid storage key pattern: ${video.storageKey}`);
        // フォールバック
        return video.videoUrl || null;
      }
      return await generatePresignedUrl(video.storageKey, 60 * 60); // 1時間有効
    } catch (error) {
      console.error(
        `[getVideoUrl] Presigned URL 生成失敗: ${video.storageKey}`,
        error
      );
      // フォールバック: videoUrl があればそちらを使用
      if (video.videoUrl) {
        return video.videoUrl;
      }
      return null;
    }
  }

  // 後方互換性: videoUrl を返す（CDN URL、期限切れの可能性あり）
  return video.videoUrl || null;
}
