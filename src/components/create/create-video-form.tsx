"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "./step-indicator";
import { TemplateGrid } from "./template-grid";
import { VideoPreview } from "./video-preview";
import { useVideoStatus } from "./use-video-status";
import { createVideo, retryVideo } from "@/actions/video";
import type { Template } from "@/db/schema";
import { VIDEO_STATUS } from "@/db/schema";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";

const STEPS = [
  { label: "背景", description: "背景の映像を選択" },
  { label: "窓", description: "窓の映像を選択" },
  { label: "車輪", description: "車輪の映像を選択" },
];

interface CreateVideoFormProps {
  templates: {
    background: Template[];
    window: Template[];
    wheel: Template[];
  };
}

type Step = 0 | 1 | 2;

export function CreateVideoForm({ templates }: CreateVideoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [selectedBackground, setSelectedBackground] = useState<Template | null>(
    null
  );
  const [selectedWindow, setSelectedWindow] = useState<Template | null>(null);
  const [selectedWheel, setSelectedWheel] = useState<Template | null>(null);

  const [createdVideoId, setCreatedVideoId] = useState<number | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // 動画ステータスのポーリング
  const { status, videoUrl, error, canRetry } = useVideoStatus({
    videoId: createdVideoId,
    enabled: createdVideoId !== null,
  });

  // 現在のステップのテンプレート一覧を取得
  const getCurrentTemplates = (): Template[] => {
    switch (currentStep) {
      case 0:
        return templates.background;
      case 1:
        return templates.window;
      case 2:
        return templates.wheel;
      default:
        return [];
    }
  };

  // 現在のステップで選択されているテンプレートID
  const getCurrentSelectedId = (): number | null => {
    switch (currentStep) {
      case 0:
        return selectedBackground?.id ?? null;
      case 1:
        return selectedWindow?.id ?? null;
      case 2:
        return selectedWheel?.id ?? null;
      default:
        return null;
    }
  };

  // テンプレート選択ハンドラ
  const handleSelectTemplate = useCallback(
    (template: Template) => {
      switch (currentStep) {
        case 0:
          setSelectedBackground(template);
          break;
        case 1:
          setSelectedWindow(template);
          break;
        case 2:
          setSelectedWheel(template);
          break;
      }
    },
    [currentStep]
  );

  // 完了したステップの配列
  const getCompletedSteps = (): number[] => {
    const completed: number[] = [];
    if (selectedBackground) completed.push(0);
    if (selectedWindow) completed.push(1);
    if (selectedWheel) completed.push(2);
    return completed;
  };

  // 次へ進めるかどうか
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return selectedBackground !== null;
      case 1:
        return selectedWindow !== null;
      case 2:
        return selectedWheel !== null;
      default:
        return false;
    }
  };

  // 動画作成
  const handleCreateVideo = async () => {
    if (!selectedBackground || !selectedWindow || !selectedWheel) {
      setCreateError("すべてのテンプレートを選択してください");
      return;
    }

    setCreateError(null);

    startTransition(async () => {
      const result = await createVideo({
        template1Id: selectedBackground.id,
        template2Id: selectedWindow.id,
        template3Id: selectedWheel.id,
      });

      if (result.success) {
        setCreatedVideoId(result.video.id);
      } else {
        setCreateError(result.error);
      }
    });
  };

  // リトライ
  const handleRetry = async () => {
    if (!createdVideoId) return;

    setCreateError(null);

    startTransition(async () => {
      const result = await retryVideo(createdVideoId);

      if (!result.success) {
        setCreateError(result.error);
      }
    });
  };

  // 動画生成開始後の表示
  if (createdVideoId !== null) {
    const isProcessing =
      status === VIDEO_STATUS.PROCESSING || status === VIDEO_STATUS.PENDING;
    const isCompleted = status === VIDEO_STATUS.COMPLETED;
    const isFailed = status === VIDEO_STATUS.FAILED;

    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">
            {isProcessing && "動画を生成しています..."}
            {isCompleted && "動画が完成しました！"}
            {isFailed && "動画生成に失敗しました"}
          </h2>
          {isProcessing && (
            <p className="text-muted-foreground">
              しばらくお待ちください（1〜2分程度）
            </p>
          )}
        </div>

        {/* プログレス表示 */}
        {isProcessing && (
          <div className="max-w-md mx-auto space-y-2">
            <Progress value={undefined} className="animate-pulse" />
            <p className="text-sm text-center text-muted-foreground">
              処理中...
            </p>
          </div>
        )}

        {/* プレビュー */}
        <div className="max-w-2xl mx-auto">
          <VideoPreview
            selectedTemplates={{
              background: selectedBackground,
              window: selectedWindow,
              wheel: selectedWheel,
            }}
            isGenerating={isProcessing}
            generatedVideoUrl={videoUrl}
          />
        </div>

        {/* エラー表示 */}
        {(isFailed || createError || error) && (
          <div className="max-w-md mx-auto bg-destructive/10 text-destructive p-4 rounded-lg text-center">
            <p>{createError || error || "エラーが発生しました"}</p>
            {canRetry && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleRetry}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                再試行
              </Button>
            )}
          </div>
        )}

        {/* 完了時のアクション */}
        {isCompleted && (
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => router.push("/mypage")}>
              マイページで確認
            </Button>
            <Button onClick={() => router.push("/reservations")}>
              投影を予約する
            </Button>
          </div>
        )}
      </div>
    );
  }

  // テンプレート選択UI
  return (
    <div className="space-y-8">
      {/* ステップインジケーター */}
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
      />

      {/* メインコンテンツ */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* 左: プレビュー */}
        <div className="order-2 md:order-1">
          <div className="sticky top-4">
            <h3 className="font-medium mb-4">プレビュー</h3>
            <VideoPreview
              selectedTemplates={{
                background: selectedBackground,
                window: selectedWindow,
                wheel: selectedWheel,
              }}
            />
          </div>
        </div>

        {/* 右: テンプレート選択 */}
        <div className="order-1 md:order-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium" data-testid="category">
                {STEPS[currentStep].label}を選択
              </h3>
              <span className="text-sm text-muted-foreground">
                {STEPS[currentStep].description}
              </span>
            </div>

            <div data-testid="template-selector">
              <TemplateGrid
                templates={getCurrentTemplates()}
                selectedId={getCurrentSelectedId()}
                onSelect={handleSelectTemplate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {createError && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
          {createError}
        </div>
      )}

      {/* ナビゲーション */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((prev) => (prev - 1) as Step)}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>

        {currentStep < 2 ? (
          <Button
            onClick={() => setCurrentStep((prev) => (prev + 1) as Step)}
            disabled={!canProceed()}
          >
            次へ
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleCreateVideo}
            disabled={
              !selectedBackground ||
              !selectedWindow ||
              !selectedWheel ||
              isPending
            }
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                作成中...
              </>
            ) : (
              "動画を作成"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
