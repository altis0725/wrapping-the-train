"use client";

import { Button } from "@/components/ui/button";
import { VideoPreview } from "./video-preview";
import { ChevronLeft, Copy, Plus } from "lucide-react";
import type { TemplateWithResolvedThumbnail } from "@/actions/template";

interface SegmentSelection {
  background: TemplateWithResolvedThumbnail | null;
  window: TemplateWithResolvedThumbnail | null;
  wheel: TemplateWithResolvedThumbnail | null;
}

interface SegmentTransitionProps {
  currentSegment: number;
  previousSelection: SegmentSelection;
  onCopyPrevious: () => void;
  onSelectNew: () => void;
  onBack: () => void;
}

export function SegmentTransition({
  currentSegment,
  previousSelection,
  onCopyPrevious,
  onSelectNew,
  onBack,
}: SegmentTransitionProps) {
  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          セグメント {currentSegment + 1} の選択
        </h2>
        <p className="text-muted-foreground">
          10秒区間のテンプレートを選択します
        </p>
      </div>

      {/* 前セグメントのプレビュー */}
      <div className="max-w-md mx-auto">
        <h3 className="font-medium mb-4 text-center">
          セグメント {currentSegment} の選択内容
        </h3>
        {previousSelection && (
          <>
            <VideoPreview
              selectedTemplates={{
                background: previousSelection.background,
                window: previousSelection.window,
                wheel: previousSelection.wheel,
              }}
            />
            <div className="mt-4 text-sm text-muted-foreground text-center">
              <p>背景: {previousSelection.background?.title ?? "未選択"}</p>
              <p>窓: {previousSelection.window?.title ?? "未選択"}</p>
              <p>車輪: {previousSelection.wheel?.title ?? "未選択"}</p>
            </div>
          </>
        )}
      </div>

      {/* 選択ボタン */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
        <Button
          variant="default"
          className="flex-1"
          onClick={onCopyPrevious}
        >
          <Copy className="h-4 w-4 mr-2" />
          前と同じ
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={onSelectNew}
        >
          <Plus className="h-4 w-4 mr-2" />
          新しく選ぶ
        </Button>
      </div>

      {/* 戻るボタン */}
      <div className="flex justify-center">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          戻って修正する
        </Button>
      </div>
    </div>
  );
}
