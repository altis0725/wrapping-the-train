import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { videos, reservations, VIDEO_STATUS, RESERVATION_STATUS } from "@/db/schema";
import { and, lt, inArray, notInArray } from "drizzle-orm";
import { sendNotification } from "@/lib/notifications";

/**
 * Cron: 期限切れ動画の自動削除
 *
 * 実行頻度: 毎日 3:00 JST（Railway/Vercel Cron）
 *
 * 処理内容:
 * 1. expires_at < NOW() の動画を取得
 * 2. 有効な予約に紐付いていない動画のみ削除
 * 3. DBレコード削除
 * 4. 通知（エラー時）
 *
 * 認証:
 * - CRON_SECRET ヘッダーで認証
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron:cleanup-videos] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // 期限切れの動画を取得（予約チェック前）
    const expiredVideos = await db
      .select({ id: videos.id, videoUrl: videos.videoUrl })
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
        timestamp: now.toISOString(),
      });
    }

    // 動画を削除
    const deleteIds = videosToDelete.map((v) => v.id);
    await db.delete(videos).where(inArray(videos.id, deleteIds));

    const skippedCount = expiredVideos.length - videosToDelete.length;

    console.log(
      `[Cron:cleanup-videos] Deleted ${videosToDelete.length} videos, skipped ${skippedCount}`
    );

    return NextResponse.json({
      success: true,
      deletedCount: videosToDelete.length,
      skippedCount,
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
