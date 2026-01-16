import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { videos, VIDEO_STATUS } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getRenderStatus, type ShotstackEnvironment } from "@/lib/shotstack";
import { downloadAndUploadVideo } from "@/lib/storage/video-upload";
import { getVideoUrl } from "@/lib/storage/resolver";
import { deleteStorageFile } from "@/lib/storage/upload";
import { isStorageConfigured } from "@/lib/storage/client";

const MAX_RETRY_COUNT = 3;

// sentinel タイムアウト（5分）- この期間を超えたら再クレーム許可
const SENTINEL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 動画のステータスを取得（ポーリング用）
 * Shotstackのステータスも同時にチェックし、DBを更新
 * 完了時はStorage Bucketに永続保存
 *
 * Race condition対策:
 * - 楽観的ロック（status=PROCESSING かつ storageKey=NULL の場合のみ更新）
 * - 既に storageKey がセットされている場合はアップロードをスキップ
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
        // Race condition対策: アトミッククレームでアップロード権を取得
        // storageKey に sentinel 値をセットして、他のリクエストが処理中でないことを確認
        const uploadingSentinel = `uploading:${Date.now()}`;

        // まず現在の storageKey を確認（タイムアウトチェック用）
        const currentState = await db
          .select({ storageKey: videos.storageKey })
          .from(videos)
          .where(eq(videos.id, videoId))
          .limit(1);

        // 既存の sentinel がタイムアウトしているかチェック
        let canClaim = true;
        if (currentState[0]?.storageKey?.startsWith("uploading:")) {
          const existingTimestamp = parseInt(
            currentState[0].storageKey.replace("uploading:", ""),
            10
          );
          const elapsed = Date.now() - existingTimestamp;
          if (elapsed < SENTINEL_TIMEOUT_MS) {
            // まだタイムアウトしていない - 別のリクエストが処理中
            canClaim = false;
          } else {
            // タイムアウト - 再クレーム許可
            console.warn(
              `[Video Status] Stale sentinel detected for video ${videoId}, allowing re-claim`
            );
          }
        }

        let claimResult: typeof currentVideo[] = [];

        if (canClaim) {
          // storageKey が NULL または タイムアウトした sentinel の場合にクレーム試行
          const existingSentinel = currentState[0]?.storageKey;

          if (existingSentinel?.startsWith("uploading:")) {
            // タイムアウトした sentinel を置き換え
            claimResult = await db
              .update(videos)
              .set({
                storageKey: uploadingSentinel,
              })
              .where(
                and(
                  eq(videos.id, videoId),
                  eq(videos.status, VIDEO_STATUS.PROCESSING),
                  eq(videos.storageKey, existingSentinel)
                )
              )
              .returning();
          } else {
            // NULL の場合の通常クレーム
            claimResult = await db
              .update(videos)
              .set({
                storageKey: uploadingSentinel,
              })
              .where(
                and(
                  eq(videos.id, videoId),
                  eq(videos.status, VIDEO_STATUS.PROCESSING),
                  isNull(videos.storageKey)
                )
              )
              .returning();
          }
        }

        // クレームに失敗した場合（別のリクエストが処理中または完了済み）
        if (claimResult.length === 0) {
          const freshVideo = await db
            .select()
            .from(videos)
            .where(eq(videos.id, videoId))
            .limit(1);

          // 完了済みの場合はその結果を返す
          if (freshVideo[0]) {
            // uploading sentinel の場合は処理中として返す（タイムアウトチェック済み）
            if (freshVideo[0].storageKey?.startsWith("uploading:")) {
              return NextResponse.json({
                id: currentVideo.id,
                status: VIDEO_STATUS.PROCESSING,
                retryCount: freshVideo[0].retryCount,
                canRetry: false,
              });
            }

            const signedUrl = await getVideoUrl({
              storageKey: freshVideo[0].storageKey,
              videoUrl: freshVideo[0].videoUrl,
            });

            return NextResponse.json({
              id: freshVideo[0].id,
              status: freshVideo[0].status,
              videoUrl: signedUrl,
              retryCount: freshVideo[0].retryCount,
              canRetry: false,
            });
          }
        }

        // クレーム成功: Storage Bucketに永続保存を試行
        const uploadResult = await downloadAndUploadVideo(
          renderStatus.url,
          user.id,
          videoId
        );

        if (uploadResult.success && uploadResult.storageKey) {
          // sentinel を実際の storageKey に置き換え
          // 自分がクレームした sentinel の場合のみ更新
          const updateResult = await db
            .update(videos)
            .set({
              status: VIDEO_STATUS.COMPLETED,
              storageKey: uploadResult.storageKey,
              videoUrl: null,
              lastError: null,
            })
            .where(
              and(
                eq(videos.id, videoId),
                eq(videos.status, VIDEO_STATUS.PROCESSING),
                eq(videos.storageKey, uploadingSentinel)
              )
            )
            .returning();

          // 更新が成功しなかった場合（sentinel が変更された）
          // アップロード済みファイルを削除して孤児ファイルを防止
          if (updateResult.length === 0) {
            console.warn(
              `[Video Status] Sentinel mismatch after upload, cleaning up orphaned file: ${uploadResult.storageKey}`
            );

            // 孤児ファイルをクリーンアップ
            if (isStorageConfigured()) {
              try {
                await deleteStorageFile(uploadResult.storageKey);
              } catch (cleanupError) {
                console.error(
                  `[Video Status] Failed to cleanup orphaned file: ${uploadResult.storageKey}`,
                  cleanupError
                );
              }
            }

            // 最新の状態を再取得して返す
            const latestVideo = await db
              .select()
              .from(videos)
              .where(eq(videos.id, videoId))
              .limit(1);

            if (latestVideo[0]) {
              const latestUrl = await getVideoUrl({
                storageKey: latestVideo[0].storageKey,
                videoUrl: latestVideo[0].videoUrl,
              });

              return NextResponse.json({
                id: latestVideo[0].id,
                status: latestVideo[0].status,
                videoUrl: latestUrl,
                retryCount: latestVideo[0].retryCount,
                canRetry: false,
              });
            }
          }

          // 署名付きURLを生成して返す
          const signedUrl = await getVideoUrl({
            storageKey: uploadResult.storageKey,
            videoUrl: null,
          });

          return NextResponse.json({
            id: currentVideo.id,
            status: VIDEO_STATUS.COMPLETED,
            videoUrl: signedUrl,
            retryCount: currentVideo.retryCount,
            canRetry: false,
          });
        } else {
          // Storage保存失敗: CDN URLをfallbackとして保存（後方互換）
          console.warn(
            `[Video Status] Storage upload failed, using CDN URL as fallback: ${uploadResult.error}`
          );

          // sentinel を CDN URL に置き換え（storageKey は null に戻す）
          // 自分がクレームした sentinel の場合のみ更新
          const fallbackResult = await db
            .update(videos)
            .set({
              status: VIDEO_STATUS.COMPLETED,
              storageKey: null,
              videoUrl: renderStatus.url,
              lastError: null,
            })
            .where(
              and(
                eq(videos.id, videoId),
                eq(videos.status, VIDEO_STATUS.PROCESSING),
                eq(videos.storageKey, uploadingSentinel)
              )
            )
            .returning();

          // 更新が成功しなかった場合（sentinel が変更された）
          if (fallbackResult.length === 0) {
            const latestVideo = await db
              .select()
              .from(videos)
              .where(eq(videos.id, videoId))
              .limit(1);

            if (latestVideo[0]) {
              const latestUrl = await getVideoUrl({
                storageKey: latestVideo[0].storageKey,
                videoUrl: latestVideo[0].videoUrl,
              });

              return NextResponse.json({
                id: latestVideo[0].id,
                status: latestVideo[0].status,
                videoUrl: latestUrl,
                retryCount: latestVideo[0].retryCount,
                canRetry: false,
              });
            }
          }

          return NextResponse.json({
            id: currentVideo.id,
            status: VIDEO_STATUS.COMPLETED,
            videoUrl: renderStatus.url,
            retryCount: currentVideo.retryCount,
            canRetry: false,
          });
        }
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
          .where(
            and(
              eq(videos.id, videoId),
              eq(videos.status, VIDEO_STATUS.PROCESSING)
            )
          );

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

  // DBの状態をそのまま返す（storageKeyがある場合は署名付きURL生成）
  let videoUrl = currentVideo.videoUrl;
  if (currentVideo.storageKey || currentVideo.videoUrl) {
    try {
      videoUrl = await getVideoUrl({
        storageKey: currentVideo.storageKey,
        videoUrl: currentVideo.videoUrl,
      });
    } catch (error) {
      console.error("[Video Status] Error generating video URL:", error);
    }
  }

  return NextResponse.json({
    id: currentVideo.id,
    status: currentVideo.status,
    videoUrl,
    error: currentVideo.lastError,
    retryCount: currentVideo.retryCount,
    canRetry:
      currentVideo.status === VIDEO_STATUS.FAILED &&
      currentVideo.retryCount < MAX_RETRY_COUNT,
  });
}
