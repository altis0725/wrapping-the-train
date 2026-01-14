"use client";

import { useState, useEffect, useCallback } from "react";
import { VIDEO_STATUS } from "@/db/schema";

interface VideoStatusResponse {
  id: number;
  status: string;
  videoUrl?: string;
  error?: string;
  retryCount: number;
  canRetry: boolean;
}

interface UseVideoStatusOptions {
  videoId: number | null;
  enabled?: boolean;
  intervalMs?: number;
}

interface UseVideoStatusReturn {
  status: string | null;
  videoUrl: string | null;
  error: string | null;
  retryCount: number;
  canRetry: boolean;
  isPolling: boolean;
}

/**
 * 動画ステータスのポーリングフック
 */
export function useVideoStatus({
  videoId,
  enabled = true,
  intervalMs = 5000,
}: UseVideoStatusOptions): UseVideoStatusReturn {
  const [status, setStatus] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!videoId) return;

    try {
      const response = await fetch(`/api/videos/${videoId}/status`);
      if (!response.ok) {
        throw new Error("ステータスの取得に失敗しました");
      }

      const data: VideoStatusResponse = await response.json();
      setStatus(data.status);
      setVideoUrl(data.videoUrl || null);
      setError(data.error || null);
      setRetryCount(data.retryCount);
      setCanRetry(data.canRetry);
    } catch (err) {
      console.error("[useVideoStatus] Error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  }, [videoId]);

  useEffect(() => {
    if (!enabled || !videoId) {
      setIsPolling(false);
      return;
    }

    // 初回取得
    fetchStatus();

    // 処理中の場合のみポーリング開始
    const shouldPoll =
      status === VIDEO_STATUS.PROCESSING || status === VIDEO_STATUS.PENDING;

    if (!shouldPoll && status !== null) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    const interval = setInterval(fetchStatus, intervalMs);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [videoId, enabled, status, intervalMs, fetchStatus]);

  return {
    status,
    videoUrl,
    error,
    retryCount,
    canRetry,
    isPolling,
  };
}
