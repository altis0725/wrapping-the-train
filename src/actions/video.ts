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
  type ShotstackResolution,
} from "@/lib/shotstack";
import { getTemplateVideoUrl, getVideoUrl, getThumbnailUrl } from "@/lib/storage/resolver";
import { deleteStorageFile } from "@/lib/storage/upload";
import { isStorageConfigured } from "@/lib/storage/client";

const MAX_RETRY_COUNT = 3;
const FREE_VIDEO_EXPIRY_DAYS = 7;

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
    const resolution: ShotstackResolution =
      currentVideo.videoType === "paid" ? "1080" : "sd";

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
      environment,
      resolution
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

/**
 * ホスト名が内部/プライベートIPまたはメタデータエンドポイントかどうかを判定
 * SSRF対策: 内部ネットワークへのアクセスを遮断
 *
 * 注: このチェックはクライアント側 <img src> に渡すURLの簡易検証用。
 * サーバー側フェッチには使用しない（DNSリバインディング対策が必要な場合は
 * DNS解決後のIP判定が必要）
 */
function isInternalHost(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase();

  // メタデータエンドポイント（AWS, GCP, Azure等）
  const metadataHosts = [
    "169.254.169.254",
    "metadata.google.internal",
    "metadata.gcp.internal",
  ];
  if (metadataHosts.includes(lowerHost)) {
    return true;
  }

  // DNSリバインディング/ワイルドカードDNSサービスを遮断
  const dnsRebindingPatterns = [
    ".nip.io",
    ".xip.io",
    ".sslip.io",
    ".localtest.me",
    ".lvh.me",
    ".vcap.me",
  ];
  if (dnsRebindingPatterns.some((p) => lowerHost.endsWith(p))) {
    return true;
  }

  // IPv6 ループバック/リンクローカル/ULA
  // URL.hostname は IPv6 を角括弧なしで返す（例: "::1", "fe80::1"）
  if (
    lowerHost === "::1" ||
    lowerHost.startsWith("fe80:") ||
    lowerHost.startsWith("fc") ||
    lowerHost.startsWith("fd") ||
    lowerHost.startsWith("::ffff:")
  ) {
    return true;
  }

  // プライベートIPレンジの検出（IPv4）
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = lowerHost.match(ipv4Pattern);
  if (match) {
    const [, a, b] = match.map(Number);
    // 0.x.x.x, 10.x.x.x, 127.x.x.x, 169.254.x.x, 172.16-31.x.x, 192.168.x.x
    // 100.64-127.x.x (CGN), 198.18-19.x.x (ベンチマーク), 224-255.x.x.x (マルチキャスト/予約)
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && b >= 18 && b <= 19) ||
      a >= 224
    ) {
      return true;
    }
  }

  // localhost のバリエーション
  if (
    lowerHost === "localhost" ||
    lowerHost.endsWith(".localhost") ||
    lowerHost.endsWith(".local")
  ) {
    return true;
  }

  return false;
}

/**
 * 外部URLが安全かどうかを検証
 * SSRF/トラッキング防止のため、https スキームのみ許可し、内部IPを遮断
 */
function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // httpsスキームのみ許可（http、javascript、data等は拒否）
    if (parsed.protocol !== "https:") {
      return false;
    }
    // 内部ホスト/プライベートIPへのアクセスを遮断
    if (isInternalHost(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

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
