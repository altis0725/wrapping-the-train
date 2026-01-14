"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Trash2,
  Calendar,
  MoreVertical,
  RefreshCw,
  Play,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { VideoWithTemplates } from "@/actions/video";
import { deleteVideo, retryVideo, canDeleteVideo } from "@/actions/video";
import { VIDEO_STATUS } from "@/db/schema";
import { formatDistanceToNow, format } from "date-fns";
import { ja } from "date-fns/locale";

interface VideoListProps {
  videos: VideoWithTemplates[];
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  [VIDEO_STATUS.PENDING]: { label: "処理待ち", variant: "secondary" },
  [VIDEO_STATUS.PROCESSING]: { label: "処理中", variant: "default" },
  [VIDEO_STATUS.COMPLETED]: { label: "完了", variant: "outline" },
  [VIDEO_STATUS.FAILED]: { label: "失敗", variant: "destructive" },
};

export function VideoList({ videos }: VideoListProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoWithTemplates | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteClick = async (video: VideoWithTemplates) => {
    setSelectedVideo(video);
    setDeleteError(null);

    // 削除可能かチェック
    const result = await canDeleteVideo(video.id);
    if (!result.canDelete) {
      setDeleteError(result.reason || "削除できません");
    }
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedVideo) return;

    setIsDeleting(true);
    const result = await deleteVideo(selectedVideo.id);

    if (result.success) {
      setDeleteDialogOpen(false);
      router.refresh();
    } else {
      setDeleteError(result.error);
    }
    setIsDeleting(false);
  };

  const handleRetry = async (videoId: number) => {
    setIsRetrying(videoId);
    const result = await retryVideo(videoId);
    if (result.success) {
      router.refresh();
    }
    setIsRetrying(null);
  };

  const handleReserve = (videoId: number) => {
    router.push(`/reservations?videoId=${videoId}`);
  };

  const handleDownload = (videoUrl: string) => {
    window.open(videoUrl, "_blank");
  };

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <Play className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">動画がありません</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          動画を作成して、プロジェクションマッピングを楽しみましょう
        </p>
        <Button className="mt-4" onClick={() => router.push("/create")}>
          動画を作成する
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onDelete={handleDeleteClick}
            onRetry={handleRetry}
            onReserve={handleReserve}
            onDownload={handleDownload}
            isRetrying={isRetrying === video.id}
          />
        ))}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>動画を削除</DialogTitle>
            <DialogDescription>
              この動画を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting || !!deleteError}
            >
              {isDeleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface VideoCardProps {
  video: VideoWithTemplates;
  onDelete: (video: VideoWithTemplates) => void;
  onRetry: (videoId: number) => void;
  onReserve: (videoId: number) => void;
  onDownload: (videoUrl: string) => void;
  isRetrying: boolean;
}

function VideoCard({
  video,
  onDelete,
  onRetry,
  onReserve,
  onDownload,
  isRetrying,
}: VideoCardProps) {
  const status = statusConfig[video.status] || {
    label: video.status,
    variant: "secondary" as const,
  };
  const isCompleted = video.status === VIDEO_STATUS.COMPLETED;
  const isFailed = video.status === VIDEO_STATUS.FAILED;
  const isProcessing =
    video.status === VIDEO_STATUS.PENDING ||
    video.status === VIDEO_STATUS.PROCESSING;

  return (
    <Card data-testid="video-item">
      <CardContent className="p-4">
        <div className="aspect-video bg-muted rounded-md mb-3 relative overflow-hidden">
          {video.template1?.thumbnailUrl ? (
            <img
              src={video.template1.thumbnailUrl}
              alt="サムネイル"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm mt-2">処理中...</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant={video.videoType === "paid" ? "default" : "secondary"}>
              {video.videoType === "paid" ? "有料" : "無料"}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(video.createdAt), {
                  addSuffix: true,
                  locale: ja,
                })}
              </span>
            </div>
            {video.expiresAt && (
              <div className="flex items-center gap-1 text-xs">
                <span>有効期限: {format(new Date(video.expiresAt), "yyyy/MM/dd")}</span>
              </div>
            )}
          </div>

          {isFailed && video.lastError && (
            <p className="text-xs text-destructive truncate">
              エラー: {video.lastError}
            </p>
          )}

          <div className="flex items-center gap-2 pt-2">
            {isCompleted && video.videoUrl && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownload(video.videoUrl!)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  ダウンロード
                </Button>
                <Button size="sm" onClick={() => onReserve(video.id)}>
                  <Calendar className="h-4 w-4 mr-1" />
                  予約
                </Button>
              </>
            )}
            {isFailed && video.retryCount < 3 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry(video.id)}
                disabled={isRetrying}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${isRetrying ? "animate-spin" : ""}`}
                />
                リトライ ({video.retryCount}/3)
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="ml-auto">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onDelete(video)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
