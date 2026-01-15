"use server";

import { db } from "@/db";
import {
  videos,
  reservations,
  templates,
  VIDEO_STATUS,
  RESERVATION_STATUS,
  type Video,
  type Template,
} from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { validateTemplateSelectionBatch } from "./template";
import {
  createVideoSchema,
  videoIdSchema,
  retryVideoSchema,
  type CreateVideoInput,
} from "@/lib/validations/video";
import {
  mergeVideos,
  type ShotstackEnvironment,
  type ShotstackResolution,
  type VideoSegment,
} from "@/lib/shotstack";
import { getTemplateVideoUrl, getVideoUrl, getThumbnailUrl } from "@/lib/storage/resolver";
import { deleteStorageFile } from "@/lib/storage/upload";
import { isStorageConfigured } from "@/lib/storage/client";
import { isValidExternalUrl } from "@/lib/validations/url";

const MAX_RETRY_COUNT = 3;
const FREE_VIDEO_EXPIRY_DAYS = 7;

// VideoStatus 型定義（型安全性のため）
export type VideoStatus = typeof VIDEO_STATUS[keyof typeof VIDEO_STATUS];

// サムネイルURL解決済みテンプレート型
export type TemplateWithResolvedThumbnail = Template & {
  resolvedThumbnailUrl?: string;
};

export type VideoWithTemplates = Video & {
  template1?: TemplateWithResolvedThumbnail | null;
  template2?: TemplateWithResolvedThumbnail | null;
  template3?: TemplateWithResolvedThumbnail | null;
};

export type CreateVideoResult =
  | { success: true; video: Video }
  | { success: false; error: string };

export type GetVideoResult =
  | { success: true; video: Video }
  | { success: false; error: string };

export type RetryVideoResult =
  | { success: true; video: Video }
  | { success: false; error: string };

/**
 * 動画を作成（draft状態で作成し、レンダリングを開始）
 * 30秒動画：3セグメント×3テンプレート = 9テンプレートIDを受け取る
 */
export async function createVideo(
  input: CreateVideoInput
): Promise<CreateVideoResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  // バリデーション
  const parsed = createVideoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "入力が不正です" };
  }

  const { segments } = parsed.data;

  // 全3セグメントのテンプレートを一括検証（クエリ最適化）
  const validations = await validateTemplateSelectionBatch(segments);

  const failedValidation = validations.find((v) => !v.valid);
  if (failedValidation) {
    return { success: false, error: failedValidation.error || "テンプレートの検証に失敗しました" };
  }

  // 有効期限を計算（無料動画は7日間）
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + FREE_VIDEO_EXPIRY_DAYS);

  // 動画レコードを作成（pending状態）- 9テンプレートIDを保存
  const [video] = await db
    .insert(videos)
    .values({
      userId: user.id,
      // セグメント1
      template1Id: segments[0].template1Id,
      template2Id: segments[0].template2Id,
      template3Id: segments[0].template3Id,
      // セグメント2
      segment2Template1Id: segments[1].template1Id,
      segment2Template2Id: segments[1].template2Id,
      segment2Template3Id: segments[1].template3Id,
      // セグメント3
      segment3Template1Id: segments[2].template1Id,
      segment3Template2Id: segments[2].template2Id,
      segment3Template3Id: segments[2].template3Id,
      status: VIDEO_STATUS.PENDING,
      videoType: "free",
      expiresAt,
    })
    .returning();

  // Shotstackでレンダリング開始
  try {
    // 全セグメントのテンプレート動画URLを解決
    const videoSegments: VideoSegment[] = await Promise.all(
      validations.map(async (validation) => {
        const { background, window, wheel } = validation.templates!;
        const [backgroundUrl, windowUrl, wheelUrl] = await Promise.all([
          getTemplateVideoUrl(background),
          getTemplateVideoUrl(window),
          getTemplateVideoUrl(wheel),
        ]);
        return { background: backgroundUrl, window: windowUrl, wheel: wheelUrl };
      })
    );

    const environment: ShotstackEnvironment = "stage"; // 無料動画はsandbox
    const { renderId } = await mergeVideos(videoSegments, environment);

    // render_idとstatus更新
    await db
      .update(videos)
      .set({
        renderId,
        status: VIDEO_STATUS.PROCESSING,
      })
      .where(eq(videos.id, video.id));

    const updatedVideo = await db
      .select()
      .from(videos)
      .where(eq(videos.id, video.id))
      .limit(1);

    return { success: true, video: updatedVideo[0] };
  } catch (error) {
    // レンダリング開始に失敗した場合
    const errorMessage =
      error instanceof Error ? error.message : "動画生成に失敗しました";

    await db
      .update(videos)
      .set({
        status: VIDEO_STATUS.FAILED,
        lastError: errorMessage,
      })
      .where(eq(videos.id, video.id));

    return { success: false, error: errorMessage };
  }
}

/**
 * 動画のステータスを取得（所有者チェック付き）
 */
export async function getVideoStatus(videoId: number): Promise<GetVideoResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  const parsed = videoIdSchema.safeParse({ videoId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "入力が不正です" };
  }

  const video = await db
    .select()
    .from(videos)
    .where(and(eq(videos.id, videoId), eq(videos.userId, user.id)))
    .limit(1);

  if (!video[0]) {
    return { success: false, error: "動画が見つかりません" };
  }

  return { success: true, video: video[0] };
}

/**
 * ユーザーの動画一覧を取得
 */
export async function getUserVideos(): Promise<Video[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const result = await db
    .select()
    .from(videos)
    .where(eq(videos.userId, user.id))
    .orderBy(desc(videos.createdAt));

  return result;
}

/**
 * 失敗した動画を手動でリトライ（30秒動画対応）
 */
export async function retryVideo(videoId: number): Promise<RetryVideoResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  const parsed = retryVideoSchema.safeParse({ videoId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "入力が不正です" };
  }

  // 動画を取得（所有者チェック）
  const video = await db
    .select()
    .from(videos)
    .where(and(eq(videos.id, videoId), eq(videos.userId, user.id)))
    .limit(1);

  if (!video[0]) {
    return { success: false, error: "動画が見つかりません" };
  }

  const currentVideo = video[0];

  // failed状態でないとリトライ不可
  if (currentVideo.status !== VIDEO_STATUS.FAILED) {
    return { success: false, error: "リトライできるのは失敗した動画のみです" };
  }

  // リトライ回数チェック
  if (currentVideo.retryCount >= MAX_RETRY_COUNT) {
    return {
      success: false,
      error: `リトライ回数の上限（${MAX_RETRY_COUNT}回）に達しています`,
    };
  }

  // セグメント1のテンプレートは必須
  if (
    !currentVideo.template1Id ||
    !currentVideo.template2Id ||
    !currentVideo.template3Id
  ) {
    return { success: false, error: "テンプレート情報が不足しています" };
  }

  // 全3セグメントのテンプレートを一括検証（クエリ最適化）
  // セグメント2,3がnullの場合はセグメント1と同じテンプレートを使用（後方互換性）
  const segmentConfigs = [
    {
      template1Id: currentVideo.template1Id,
      template2Id: currentVideo.template2Id,
      template3Id: currentVideo.template3Id,
    },
    {
      template1Id: currentVideo.segment2Template1Id ?? currentVideo.template1Id,
      template2Id: currentVideo.segment2Template2Id ?? currentVideo.template2Id,
      template3Id: currentVideo.segment2Template3Id ?? currentVideo.template3Id,
    },
    {
      template1Id: currentVideo.segment3Template1Id ?? currentVideo.template1Id,
      template2Id: currentVideo.segment3Template2Id ?? currentVideo.template2Id,
      template3Id: currentVideo.segment3Template3Id ?? currentVideo.template3Id,
    },
  ];

  const validations = await validateTemplateSelectionBatch(segmentConfigs);

  const failedValidation = validations.find((v) => !v.valid);
  if (failedValidation) {
    return { success: false, error: failedValidation.error || "テンプレートの検証に失敗しました" };
  }

  try {
    const environment: ShotstackEnvironment =
      currentVideo.videoType === "paid" ? "production" : "stage";
    const resolution: ShotstackResolution =
      currentVideo.videoType === "paid" ? "1080" : "sd";

    // 全セグメントのテンプレート動画URLを解決
    const videoSegments: VideoSegment[] = await Promise.all(
      validations.map(async (validation) => {
        const { background, window, wheel } = validation.templates!;
        const [backgroundUrl, windowUrl, wheelUrl] = await Promise.all([
          getTemplateVideoUrl(background),
          getTemplateVideoUrl(window),
          getTemplateVideoUrl(wheel),
        ]);
        return { background: backgroundUrl, window: windowUrl, wheel: wheelUrl };
      })
    );

    const { renderId } = await mergeVideos(videoSegments, environment, resolution);

    // ステータスとリトライ回数を更新
    await db
      .update(videos)
      .set({
        renderId,
        status: VIDEO_STATUS.PROCESSING,
        retryCount: currentVideo.retryCount + 1,
        lastError: null,
      })
      .where(eq(videos.id, videoId));

    const updatedVideo = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    return { success: true, video: updatedVideo[0] };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "リトライに失敗しました";

    await db
      .update(videos)
      .set({
        lastError: errorMessage,
        retryCount: currentVideo.retryCount + 1,
      })
      .where(eq(videos.id, videoId));

    return { success: false, error: errorMessage };
  }
}

/**
 * 動画のステータスを更新（内部用・Webhook/Cron専用）
 *
 * 注意: この関数は認証チェックを行わない内部用関数です。
 * 呼び出し元（Webhook, Cron）で適切な認可を行うこと。
 * - Webhook: Shotstack署名検証後に呼び出し
 * - Cron: サーバー内部からのみ呼び出し
 *
 * @internal この関数はクライアントから直接呼び出さないでください
 */
export async function updateVideoStatus(
  videoId: number,
  status: VideoStatus,
  videoUrl?: string,
  error?: string
): Promise<void> {
  // VideoStatus型で型安全性を確保
  const updateData: Partial<Video> = { status };

  if (videoUrl) {
    updateData.videoUrl = videoUrl;
  }

  if (error) {
    updateData.lastError = error;
  }

  await db.update(videos).set(updateData).where(eq(videos.id, videoId));
}

export type CanDeleteVideoResult = {
  canDelete: boolean;
  reason?: string;
};

export type DeleteVideoResult =
  | { success: true }
  | { success: false; error: string };

/**
 * 動画が削除可能かどうかをチェック
 */
export async function canDeleteVideo(
  videoId: number
): Promise<CanDeleteVideoResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { canDelete: false, reason: "認証が必要です" };
  }

  // 動画を取得（所有者チェック）
  const video = await db
    .select()
    .from(videos)
    .where(and(eq(videos.id, videoId), eq(videos.userId, user.id)))
    .limit(1);

  if (!video[0]) {
    return { canDelete: false, reason: "動画が見つかりません" };
  }

  // 有効な予約に紐付いているかチェック
  const activeReservation = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.videoId, videoId),
        inArray(reservations.status, [
          RESERVATION_STATUS.HOLD,
          RESERVATION_STATUS.CONFIRMED,
          RESERVATION_STATUS.COMPLETED,
        ])
      )
    )
    .limit(1);

  if (activeReservation[0]) {
    return {
      canDelete: false,
      reason: "有効な予約に紐付いているため削除できません",
    };
  }

  return { canDelete: true };
}

/**
 * 動画を削除
 * Storage Bucket のファイルも削除（孤児ファイル防止）
 */
export async function deleteVideo(videoId: number): Promise<DeleteVideoResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  const parsed = videoIdSchema.safeParse({ videoId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "入力が不正です",
    };
  }

  // 削除可能かチェック
  const canDelete = await canDeleteVideo(videoId);
  if (!canDelete.canDelete) {
    return { success: false, error: canDelete.reason || "削除できません" };
  }

  // storageKey を取得（Storage削除用）
  const video = await db
    .select({ storageKey: videos.storageKey })
    .from(videos)
    .where(and(eq(videos.id, videoId), eq(videos.userId, user.id)))
    .limit(1);

  // Storage Bucket からファイル削除（存在する場合）
  if (video[0]?.storageKey && isStorageConfigured()) {
    // セキュリティ: videos/ プレフィックスのみ許可（任意オブジェクト削除防止）
    // レガシーキーや異なる拡張子も削除可能に緩和
    if (video[0].storageKey.startsWith("videos/")) {
      try {
        const result = await deleteStorageFile(video[0].storageKey);
        if (!result.success) {
          console.error(
            `[deleteVideo] Storage削除失敗 (video ${videoId}): ${result.error}`
          );
          // Storage削除失敗してもDB削除は続行（孤児ファイルは許容）
        }
      } catch (error) {
        console.error(`[deleteVideo] Storage削除エラー (video ${videoId}):`, error);
        // DB削除は続行
      }
    } else {
      console.warn(
        `[deleteVideo] Invalid storageKey prefix (video ${videoId}): ${video[0].storageKey}`
      );
    }
  }

  // 動画を削除
  await db.delete(videos).where(eq(videos.id, videoId));

  return { success: true };
}

// isInternalHost, isValidExternalUrl は @/lib/validations/url から import 済み

/**
 * テンプレートのサムネイルURLを解決
 * storageKey形式の場合はPresigned URLを生成
 * キャッシュ付きで重複呼び出しを防止
 */
async function resolveTemplateThumbnail(
  template: Template,
  cache: Map<number, string | undefined>
): Promise<TemplateWithResolvedThumbnail> {
  // キャッシュチェック
  if (cache.has(template.id)) {
    return { ...template, resolvedThumbnailUrl: cache.get(template.id) };
  }

  let resolvedThumbnailUrl: string | undefined;
  const thumbnailUrl = template.thumbnailUrl;

  if (!thumbnailUrl) {
    cache.set(template.id, undefined);
    return { ...template, resolvedThumbnailUrl };
  }

  // storageKey形式（thumbnails/...）かどうかを判定
  const normalized = thumbnailUrl.replace(/^\/+/, "");
  if (normalized.startsWith("thumbnails/")) {
    try {
      resolvedThumbnailUrl = await getThumbnailUrl(normalized);
    } catch {
      // エラー時は詳細をログ出力しない（内部パス漏洩防止）
      // フォールバックなし（storageKey形式なので外部URLは期待しない）
    }
  } else if (isValidExternalUrl(thumbnailUrl)) {
    // 外部 URL の場合はhttpsのみ許可
    resolvedThumbnailUrl = thumbnailUrl;
  }
  // 不正なURLの場合は undefined のまま

  cache.set(template.id, resolvedThumbnailUrl);
  return { ...template, resolvedThumbnailUrl };
}

/**
 * ユーザーの動画一覧をテンプレート情報付きで取得
 * storageKey がある場合は署名付きURLを生成
 */
export async function getUserVideosWithTemplates(): Promise<VideoWithTemplates[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const result = await db
    .select({
      video: videos,
      template1: templates,
    })
    .from(videos)
    .leftJoin(templates, eq(videos.template1Id, templates.id))
    .where(eq(videos.userId, user.id))
    .orderBy(desc(videos.createdAt));

  // 全テンプレートを取得してマップを作成
  const allTemplates = await db.select().from(templates);
  const templateMap = new Map(allTemplates.map((t) => [t.id, t]));

  // サムネイルURL解決のキャッシュ（同一テンプレートの重複API呼び出し防止）
  const thumbnailCache = new Map<number, string | undefined>();

  // 署名付きURLを並列生成
  const videosWithUrls = await Promise.all(
    result.map(async ({ video }) => {
      // storageKey または videoUrl から署名付きURLを取得
      let resolvedVideoUrl = video.videoUrl;
      if (video.storageKey || video.videoUrl) {
        try {
          resolvedVideoUrl = await getVideoUrl({
            storageKey: video.storageKey,
            videoUrl: video.videoUrl,
          });
        } catch (error) {
          console.error(
            `[getUserVideosWithTemplates] URL解決エラー (video ${video.id}):`,
            error
          );
        }
      }

      // テンプレートのサムネイルURLを解決（キャッシュで重複呼び出し防止）
      const template1 = video.template1Id ? templateMap.get(video.template1Id) : null;
      const template2 = video.template2Id ? templateMap.get(video.template2Id) : null;
      const template3 = video.template3Id ? templateMap.get(video.template3Id) : null;

      const [resolvedTemplate1, resolvedTemplate2, resolvedTemplate3] = await Promise.all([
        template1 ? resolveTemplateThumbnail(template1, thumbnailCache) : null,
        template2 ? resolveTemplateThumbnail(template2, thumbnailCache) : null,
        template3 ? resolveTemplateThumbnail(template3, thumbnailCache) : null,
      ]);

      return {
        ...video,
        videoUrl: resolvedVideoUrl,
        template1: resolvedTemplate1,
        template2: resolvedTemplate2,
        template3: resolvedTemplate3,
      };
    })
  );

  return videosWithUrls;
}
