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
    <Card data-testid="video-item" className="bg-black/40 border-white/10 overflow-hidden hover:border-cyan-500/50 transition-all duration-300 group">
      <CardContent className="p-0">
        <div className="aspect-video bg-black/60 relative overflow-hidden group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-500">
          {(() => {
            // 新仕様（60秒動画）を優先、なければ旧仕様（30秒動画）を使用
            const thumbnailUrl =
              video.background1Template?.resolvedThumbnailUrl ??
              video.background1Template?.thumbnailUrl ??
              video.template1?.resolvedThumbnailUrl ??
              video.template1?.thumbnailUrl;
            return thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="サムネイル"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="h-12 w-12 text-white/20 group-hover:text-cyan-400 transition-colors duration-300" />
              </div>
            );
          })()}

          {/* Status Overlay */}
          <div className="absolute top-2 right-2 flex gap-2">
            <Badge variant="outline" className={`backdrop-blur-md ${video.videoType === "paid"
                ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                : "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
              }`}>
              {video.videoType === "paid" ? "PREMIUM" : "FREE"}
            </Badge>
            <Badge variant="outline" className={`backdrop-blur-md border-opacity-50 ${status.variant === "default" ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" :
                status.variant === "secondary" ? "bg-white/10 border-white/20 text-white/70" :
                  status.variant === "destructive" ? "bg-red-500/20 border-red-500 text-red-400" :
                    "bg-green-500/20 border-green-500 text-green-400"
              }`}>
              {status.label}
            </Badge>
          </div>

          {isProcessing && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
              <div className="text-cyan-400 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm font-orbitron tracking-wider">PROCESSING...</p>
              </div>
            </div>
          )}

          {/* Cyber scan effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 to-transparent" />
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-cyan-500/70" />
              <span>
                {formatDistanceToNow(new Date(video.createdAt), {
                  addSuffix: true,
                  locale: ja,
                })}
              </span>
            </div>
            {video.expiresAt && (
              <span className="text-orange-400/80">
                期限: {format(new Date(video.expiresAt), "MM/dd")}
              </span>
            )}
          </div>

          {isFailed && video.lastError && (
            <div className="bg-red-950/30 border border-red-900/50 rounded p-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 break-all line-clamp-2">
                {video.lastError}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {isCompleted && video.videoUrl && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 bg-transparent border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                  onClick={() => onDownload(video.videoUrl!)}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  保存
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white border-0 shadow-[0_0_10px_rgba(8,145,178,0.5)]"
                  onClick={() => onReserve(video.id)}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  予約
                </Button>
              </>
            )}
            {isFailed && video.retryCount < 3 && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-white/20 hover:bg-white/10"
                onClick={() => onRetry(video.id)}
                disabled={isRetrying}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-2 ${isRetrying ? "animate-spin" : ""}`}
                />
                再試行
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/90 border-white/10 backdrop-blur-xl">
                <DropdownMenuItem
                  onClick={() => onDelete(video)}
                  className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-950/30 cursor-pointer"
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
