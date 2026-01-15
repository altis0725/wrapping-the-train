"use client";

import Image from "next/image";
import type { TemplateWithResolvedThumbnail } from "@/actions/template";

interface VideoPreviewProps {
  selectedTemplates: {
    background: TemplateWithResolvedThumbnail | null;
    window: TemplateWithResolvedThumbnail | null;
    wheel: TemplateWithResolvedThumbnail | null;
  };
  isGenerating?: boolean;
  generatedVideoUrl?: string | null;
}

export function VideoPreview({
  selectedTemplates,
  isGenerating,
  generatedVideoUrl,
}: VideoPreviewProps) {
  // 生成完了した動画がある場合
  if (generatedVideoUrl) {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <video
          src={generatedVideoUrl}
          controls
          className="w-full h-full"
          poster={selectedTemplates.background?.resolvedThumbnailUrl || undefined}
        />
      </div>
    );
  }

  // 生成中の場合
  if (isGenerating) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">動画を生成中...</p>
        </div>
      </div>
    );
  }

  // プレビュー表示（選択されたテンプレートを表示）
  const hasAnySelection =
    selectedTemplates.background ||
    selectedTemplates.window ||
    selectedTemplates.wheel;

  if (!hasAnySelection) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">テンプレートを選択してください</p>
      </div>
    );
  }

  // 選択されたテンプレートのサムネイルを重ねて表示
  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
      {/* 背景レイヤー */}
      {selectedTemplates.background?.resolvedThumbnailUrl && (
        <Image
          src={selectedTemplates.background.resolvedThumbnailUrl}
          alt="背景"
          fill
          className="object-cover"
        />
      )}

      {/* 合成プレビューの説明 */}
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
        <div className="text-center text-white space-y-2">
          <p className="font-medium">プレビュー</p>
          <div className="text-sm space-y-1">
            {selectedTemplates.background && (
              <p>背景: {selectedTemplates.background.title}</p>
            )}
            {selectedTemplates.window && (
              <p>窓: {selectedTemplates.window.title}</p>
            )}
            {selectedTemplates.wheel && (
              <p>車輪: {selectedTemplates.wheel.title}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
