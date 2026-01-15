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
import { validateTemplateSelection } from "./template";
import {
  createVideoSchema,
  videoIdSchema,
  retryVideoSchema,
  type CreateVideoInput,
} from "@/lib/validations/video";
import {
  mergeVideos,
  type ShotstackEnvironment,
} from "@/lib/shotstack";
import { getTemplateVideoUrl } from "@/lib/storage/resolver";

const MAX_RETRY_COUNT = 3;
const FREE_VIDEO_EXPIRY_DAYS = 7;

export type VideoWithTemplates = Video & {
  template1?: Template | null;
  template2?: Template | null;
  template3?: Template | null;
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

  const { template1Id, template2Id, template3Id } = parsed.data;

  // テンプレートの検証
  const validation = await validateTemplateSelection(
    template1Id,
    template2Id,
    template3Id
  );

  if (!validation.valid || !validation.templates) {
    return { success: false, error: validation.error || "テンプレートの検証に失敗しました" };
  }

  const { background, window, wheel } = validation.templates;

  // 有効期限を計算（無料動画は7日間）
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + FREE_VIDEO_EXPIRY_DAYS);

  // 動画レコードを作成（pending状態）
  const [video] = await db
    .insert(videos)
    .values({
      userId: user.id,
      template1Id,
      template2Id,
      template3Id,
      status: VIDEO_STATUS.PENDING,
      videoType: "free",
      expiresAt,
    })
    .returning();

  // Shotstackでレンダリング開始
  try {
    // テンプレート動画のURLを解決（storageKeyがある場合はPresigned URL生成）
    const [backgroundUrl, windowUrl, wheelUrl] = await Promise.all([
      getTemplateVideoUrl(background),
      getTemplateVideoUrl(window),
      getTemplateVideoUrl(wheel),
    ]);

    const environment: ShotstackEnvironment = "stage"; // 無料動画はsandbox
    const { renderId } = await mergeVideos(
      backgroundUrl,
      windowUrl,
      wheelUrl,
      environment
    );

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
 * 失敗した動画を手動でリトライ
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

  // テンプレートを再取得
  if (
    !currentVideo.template1Id ||
    !currentVideo.template2Id ||
    !currentVideo.template3Id
  ) {
    return { success: false, error: "テンプレート情報が不足しています" };
  }

  const validation = await validateTemplateSelection(
    currentVideo.template1Id,
    currentVideo.template2Id,
    currentVideo.template3Id
  );

  if (!validation.valid || !validation.templates) {
    return { success: false, error: validation.error || "テンプレートの検証に失敗しました" };
  }

  const { background, window, wheel } = validation.templates;

  try {
    const environment: ShotstackEnvironment =
      currentVideo.videoType === "paid" ? "production" : "stage";

    // テンプレート動画のURLを解決（storageKeyがある場合はPresigned URL生成）
    const [backgroundUrl, windowUrl, wheelUrl] = await Promise.all([
      getTemplateVideoUrl(background),
      getTemplateVideoUrl(window),
      getTemplateVideoUrl(wheel),
    ]);

    const { renderId } = await mergeVideos(
      backgroundUrl,
      windowUrl,
      wheelUrl,
      environment
    );

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
 * 動画のステータスを更新（内部用）
 */
export async function updateVideoStatus(
  videoId: number,
  status: string,
  videoUrl?: string,
  error?: string
): Promise<void> {
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

  // 動画を削除
  await db.delete(videos).where(eq(videos.id, videoId));

  return { success: true };
}

/**
 * ユーザーの動画一覧をテンプレート情報付きで取得
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

  return result.map(({ video }) => ({
    ...video,
    template1: video.template1Id ? templateMap.get(video.template1Id) : null,
    template2: video.template2Id ? templateMap.get(video.template2Id) : null,
    template3: video.template3Id ? templateMap.get(video.template3Id) : null,
  }));
}
