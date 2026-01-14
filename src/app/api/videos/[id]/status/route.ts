import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { videos, VIDEO_STATUS } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getRenderStatus, type ShotstackEnvironment } from "@/lib/shotstack";

const MAX_RETRY_COUNT = 3;

/**
 * 動画のステータスを取得（ポーリング用）
 * Shotstackのステータスも同時にチェックし、DBを更新
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;
  const videoId = parseInt(id, 10);

  if (isNaN(videoId)) {
    return NextResponse.json({ error: "無効な動画IDです" }, { status: 400 });
  }

  // 動画を取得（所有者チェック）
  const video = await db
    .select()
    .from(videos)
    .where(and(eq(videos.id, videoId), eq(videos.userId, user.id)))
    .limit(1);

  if (!video[0]) {
    return NextResponse.json({ error: "動画が見つかりません" }, { status: 404 });
  }

  const currentVideo = video[0];

  // 処理中の場合、Shotstackのステータスを確認
  if (
    currentVideo.status === VIDEO_STATUS.PROCESSING &&
    currentVideo.renderId
  ) {
    try {
      const environment: ShotstackEnvironment =
        currentVideo.videoType === "paid" ? "production" : "stage";

      const renderStatus = await getRenderStatus(
        currentVideo.renderId,
        environment
      );

      // 完了した場合
      if (renderStatus.status === "done" && renderStatus.url) {
        await db
          .update(videos)
          .set({
            status: VIDEO_STATUS.COMPLETED,
            videoUrl: renderStatus.url,
            lastError: null,
          })
          .where(eq(videos.id, videoId));

        return NextResponse.json({
          id: currentVideo.id,
          status: VIDEO_STATUS.COMPLETED,
          videoUrl: renderStatus.url,
          retryCount: currentVideo.retryCount,
          canRetry: false,
        });
      }

      // 失敗した場合
      if (renderStatus.status === "failed") {
        const newRetryCount = currentVideo.retryCount + 1;

        await db
          .update(videos)
          .set({
            status: VIDEO_STATUS.FAILED,
            lastError: renderStatus.error || "レンダリングに失敗しました",
            retryCount: newRetryCount,
          })
          .where(eq(videos.id, videoId));

        return NextResponse.json({
          id: currentVideo.id,
          status: VIDEO_STATUS.FAILED,
          error: renderStatus.error || "レンダリングに失敗しました",
          retryCount: newRetryCount,
          canRetry: newRetryCount < MAX_RETRY_COUNT,
        });
      }

      // まだ処理中
      return NextResponse.json({
        id: currentVideo.id,
        status: VIDEO_STATUS.PROCESSING,
        retryCount: currentVideo.retryCount,
        canRetry: false,
      });
    } catch (error) {
      console.error("[Video Status] Error checking Shotstack status:", error);
      // Shotstackのステータス取得に失敗しても、DBの状態を返す
    }
  }

  // DBの状態をそのまま返す
  return NextResponse.json({
    id: currentVideo.id,
    status: currentVideo.status,
    videoUrl: currentVideo.videoUrl,
    error: currentVideo.lastError,
    retryCount: currentVideo.retryCount,
    canRetry:
      currentVideo.status === VIDEO_STATUS.FAILED &&
      currentVideo.retryCount < MAX_RETRY_COUNT,
  });
}
