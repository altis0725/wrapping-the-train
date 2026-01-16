import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { videos, reservations, VIDEO_STATUS, RESERVATION_STATUS } from "@/db/schema";
import { and, lt, inArray, notInArray } from "drizzle-orm";
import { sendNotification } from "@/lib/notifications";
import { deleteStorageFile } from "@/lib/storage/upload";
import { isStorageConfigured } from "@/lib/storage/client";

/**
 * Cron: 期限切れ動画の自動削除
 *
 * 実行頻度: 毎日 3:00 JST（Railway/Vercel Cron）
 *
 * 処理内容:
 * 1. expires_at < NOW() の動画を取得
 * 2. 有効な予約に紐付いていない動画のみ削除
 * 3. Storage Bucket からファイル削除（storageKey がある場合）
 * 4. DBレコード削除
 * 5. 通知（エラー時）
 *
 * 認証:
 * - CRON_SECRET ヘッダーで認証
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // セキュリティ: CRON_SECRET 未設定時は fail-closed（認証必須）
  if (!cronSecret) {
    console.error("[Cron:cleanup-videos] CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Cron endpoint not configured" },
      { status: 503 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron:cleanup-videos] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // 期限切れの動画を取得（予約チェック前）
    const expiredVideos = await db
      .select({
        id: videos.id,
        videoUrl: videos.videoUrl,
        storageKey: videos.storageKey,
      })
      .from(videos)
      .where(
        and(
          lt(videos.expiresAt, now),
          // 失敗・保留・完了状態のみ対象（処理中は除外）
          notInArray(videos.status, [VIDEO_STATUS.PROCESSING])
        )
      );

    if (expiredVideos.length === 0) {
      console.log("[Cron:cleanup-videos] No expired videos found");
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        skippedCount: 0,
        storageDeletedCount: 0,
        storageErrorCount: 0,
        timestamp: now.toISOString(),
      });
    }

    const videoIds = expiredVideos.map((v) => v.id);

    // 有効な予約に紐付いている動画IDを取得
    const activeReservations = await db
      .select({ videoId: reservations.videoId })
      .from(reservations)
      .where(
        and(
          inArray(reservations.videoId, videoIds),
          inArray(reservations.status, [
            RESERVATION_STATUS.HOLD,
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.COMPLETED,
          ])
        )
      );

    const protectedVideoIds = new Set(activeReservations.map((r) => r.videoId));
    const videosToDelete = expiredVideos.filter(
      (v) => !protectedVideoIds.has(v.id)
    );

    if (videosToDelete.length === 0) {
      console.log(
        `[Cron:cleanup-videos] All ${expiredVideos.length} expired videos are protected by reservations`
      );
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        skippedCount: expiredVideos.length,
        storageDeletedCount: 0,
        storageErrorCount: 0,
        timestamp: now.toISOString(),
      });
    }

    // Storage Bucket からファイル削除（storageKey がある場合）
    let storageDeletedCount = 0;
    let storageErrorCount = 0;

    if (isStorageConfigured()) {
      for (const video of videosToDelete) {
        if (video.storageKey) {
          // セキュリティ: 厳格なパターンバリデーション
          // 期待されるパターン: videos/{userId}/{videoId}/{timestamp}.mp4
          // 不正なstorageKeyによる任意オブジェクト削除を防止
          const storageKeyPattern = /^videos\/\d+\/\d+\/\d+\.mp4$/;
          if (!storageKeyPattern.test(video.storageKey)) {
            console.error(
              `[Cron:cleanup-videos] Skipping invalid storage key pattern: ${video.storageKey}`
            );
            storageErrorCount++;
            continue;
          }

          try {
            const result = await deleteStorageFile(video.storageKey);
            if (result.success) {
              storageDeletedCount++;
              console.log(
                `[Cron:cleanup-videos] Storage deleted: ${video.storageKey}`
              );
            } else {
              storageErrorCount++;
              console.error(
                `[Cron:cleanup-videos] Storage delete failed: ${video.storageKey} - ${result.error}`
              );
            }
          } catch (error) {
            storageErrorCount++;
            console.error(
              `[Cron:cleanup-videos] Storage delete error: ${video.storageKey}`,
              error
            );
          }
        }
      }
    }

    // DBレコードを削除（Storage削除の成否に関わらず実行）
    const deleteIds = videosToDelete.map((v) => v.id);
    await db.delete(videos).where(inArray(videos.id, deleteIds));

    const skippedCount = expiredVideos.length - videosToDelete.length;

    console.log(
      `[Cron:cleanup-videos] Deleted ${videosToDelete.length} videos (storage: ${storageDeletedCount} ok, ${storageErrorCount} errors), skipped ${skippedCount}`
    );

    return NextResponse.json({
      success: true,
      deletedCount: videosToDelete.length,
      skippedCount,
      storageDeletedCount,
      storageErrorCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[Cron:cleanup-videos] Error:", error);

    // エラー通知
    await sendNotification({
      type: "error",
      title: "Cron: 動画削除エラー",
      message: error instanceof Error ? error.message : "Unknown error",
    }).catch((e) => console.error("[Cron:cleanup-videos] Notification failed:", e));

    return NextResponse.json(
      { error: "Failed to cleanup expired videos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
