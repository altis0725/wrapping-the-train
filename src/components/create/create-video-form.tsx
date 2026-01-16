"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "./step-indicator";
import { TemplateGrid } from "./template-grid";
import { BackgroundGrid } from "./background-grid";
import { VideoPreview } from "./video-preview";
import { useVideoStatus } from "./use-video-status";
import { createVideo, retryVideo } from "@/actions/video";
import { VIDEO_STATUS } from "@/db/schema";
import type { TemplateWithResolvedThumbnail } from "@/actions/template";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";

// 新仕様: 60秒動画（背景6個 + 窓1個 + 車輪1個）
const BACKGROUND_COUNT = 6;

const STEPS = [
  { label: "背景", description: "6つの背景映像を選択" },
  { label: "窓", description: "窓の映像を1つ選択" },
  { label: "車輪", description: "車輪の映像を1つ選択" },
];

interface CreateVideoFormProps {
  templates: {
    background: TemplateWithResolvedThumbnail[];
    window: TemplateWithResolvedThumbnail[];
    wheel: TemplateWithResolvedThumbnail[];
  };
}

type Step = 0 | 1 | 2;

// 新仕様の選択状態
interface VideoSelection {
  backgrounds: (TemplateWithResolvedThumbnail | null)[];  // 6個の配列
  window: TemplateWithResolvedThumbnail | null;
  wheel: TemplateWithResolvedThumbnail | null;
}

export function CreateVideoForm({ templates }: CreateVideoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 選択状態管理（新仕様）
  const [selection, setSelection] = useState<VideoSelection>({
    backgrounds: Array(BACKGROUND_COUNT).fill(null),
    window: null,
    wheel: null,
  });

  // 現在のステップ（0: 背景, 1: 窓, 2: 車輪）
  const [currentStep, setCurrentStep] = useState<Step>(0);

  // 背景選択時のアクティブスロット
  const [activeBackgroundSlot, setActiveBackgroundSlot] = useState<number | null>(0);

  const [createdVideoId, setCreatedVideoId] = useState<number | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // 動画ステータスのポーリング
  const { status, videoUrl, error, canRetry } = useVideoStatus({
    videoId: createdVideoId,
    enabled: createdVideoId !== null,
  });

  // 完了したステップの配列
  const getCompletedSteps = (): number[] => {
    const completed: number[] = [];
    const allBackgroundsSelected = selection.backgrounds.every((bg) => bg !== null);
    if (allBackgroundsSelected) completed.push(0);
    if (selection.window) completed.push(1);
    if (selection.wheel) completed.push(2);
    return completed;
  };

  // 次へ進めるかどうか
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return selection.backgrounds.every((bg) => bg !== null);
      case 1:
        return selection.window !== null;
      case 2:
        return selection.wheel !== null;
      default:
        return false;
    }
  };

  // 背景スロットをクリック
  const handleBackgroundSlotClick = (slotIndex: number) => {
    setActiveBackgroundSlot(slotIndex);
  };

  // 背景テンプレートを選択
  const handleBackgroundSelect = useCallback(
    (template: TemplateWithResolvedThumbnail) => {
      if (activeBackgroundSlot === null) return;

      setSelection((prev) => {
        const newBackgrounds = [...prev.backgrounds];
        newBackgrounds[activeBackgroundSlot] = template;

        // setSelection内で新しい配列を使って次スロットを計算（stale closure回避）
        const nextEmptySlot = newBackgrounds.findIndex(
          (bg, idx) => bg === null && idx !== activeBackgroundSlot
        );
        if (nextEmptySlot !== -1) {
          setActiveBackgroundSlot(nextEmptySlot);
        } else {
          // 全スロット選択済み
          setActiveBackgroundSlot(null);
        }

        return { ...prev, backgrounds: newBackgrounds };
      });
    },
    [activeBackgroundSlot]
  );

  // 窓テンプレートを選択
  const handleWindowSelect = useCallback(
    (template: TemplateWithResolvedThumbnail) => {
      setSelection((prev) => ({ ...prev, window: template }));
    },
    []
  );

  // 車輪テンプレートを選択
  const handleWheelSelect = useCallback(
    (template: TemplateWithResolvedThumbnail) => {
      setSelection((prev) => ({ ...prev, wheel: template }));
    },
    []
  );

  // 次へボタンのハンドラ
  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  // 戻るボタンのハンドラ
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  // 動画作成
  const handleCreateVideo = async () => {
    // 全選択が完了しているか確認
    const allBackgroundsSelected = selection.backgrounds.every((bg) => bg !== null);
    if (!allBackgroundsSelected || !selection.window || !selection.wheel) {
      setCreateError("すべてのテンプレートを選択してください");
      return;
    }

    setCreateError(null);

    startTransition(async () => {
      const result = await createVideo({
        backgrounds: selection.backgrounds.map((bg) => bg!.id),
        windowTemplateId: selection.window!.id,
        wheelTemplateId: selection.wheel!.id,
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
        {/* ライブリージョンで状態変化を通知 */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-center space-y-2"
        >
          <h2 className="text-2xl font-bold">
            {isProcessing && "動画を生成しています..."}
            {isCompleted && "動画が完成しました！"}
            {isFailed && "動画生成に失敗しました"}
          </h2>
          {isProcessing && (
            <p className="text-muted-foreground">
              しばらくお待ちください（2〜3分程度）
            </p>
          )}
        </div>

        {/* プログレス表示 */}
        {isProcessing && (
          <div className="max-w-md mx-auto space-y-2">
            <Progress
              value={undefined}
              className="animate-pulse"
              aria-label="動画生成中"
            />
            <p className="text-sm text-center text-muted-foreground" aria-hidden="true">
              60秒動画を生成中...
            </p>
          </div>
        )}

        {/* プレビュー（背景1のサムネイル表示） */}
        <div className="max-w-2xl mx-auto">
          <VideoPreview
            selectedTemplates={{
              background: selection.backgrounds[0],
              window: selection.window,
              wheel: selection.wheel,
            }}
            isGenerating={isProcessing}
            generatedVideoUrl={videoUrl}
          />
        </div>

        {/* エラー表示 */}
        {(isFailed || createError || error) && (
          <div
            role="alert"
            aria-live="assertive"
            className="max-w-md mx-auto bg-destructive/10 text-destructive p-4 rounded-lg text-center"
          >
            <p id="error-message">{createError || error || "エラーが発生しました"}</p>
            {canRetry && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleRetry}
                disabled={isPending}
                aria-describedby="error-message"
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
            <Button
              variant="outline"
              onClick={() => router.push("/mypage")}
              aria-label="作成した動画をマイページで確認"
            >
              マイページで確認
            </Button>
            <Button
              onClick={() => router.push("/reservations")}
              aria-label="作成した動画の投影を予約"
            >
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
      <div className="space-y-6">
        {/* Step 0: 背景6個選択 */}
        {currentStep === 0 && (
          <BackgroundGrid
            templates={templates.background}
            selectedBackgrounds={selection.backgrounds}
            activeSlot={activeBackgroundSlot}
            onSlotClick={handleBackgroundSlotClick}
            onTemplateSelect={handleBackgroundSelect}
          />
        )}

        {/* Step 1: 窓選択 */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium" data-testid="category">
                窓を選択
              </h3>
              <span className="text-sm text-muted-foreground">
                6セグメント全体で同じ映像を使用
              </span>
            </div>
            <TemplateGrid
              templates={templates.window}
              selectedId={selection.window?.id ?? null}
              onSelect={handleWindowSelect}
            />
          </div>
        )}

        {/* Step 2: 車輪選択 */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium" data-testid="category">
                車輪を選択
              </h3>
              <span className="text-sm text-muted-foreground">
                6セグメント全体で同じ映像を使用
              </span>
            </div>
            <TemplateGrid
              templates={templates.wheel}
              selectedId={selection.wheel?.id ?? null}
              onSelect={handleWheelSelect}
            />
          </div>
        )}
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
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>

        {currentStep < 2 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            次へ
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleCreateVideo} disabled={isPending || !canProceed()}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                作成中...
              </>
            ) : (
              "動画を作成（60秒）"
            )}
          </Button>
        )}
      </div>

      {/* 選択サマリー */}
      <div className="border-t pt-6">
        <h3 className="font-medium mb-4">選択内容</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">背景:</span>
            <span className="ml-2">
              {selection.backgrounds.filter((bg) => bg !== null).length} / 6
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">窓:</span>
            <span className="ml-2">
              {selection.window ? selection.window.title : "未選択"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">車輪:</span>
            <span className="ml-2">
              {selection.wheel ? selection.wheel.title : "未選択"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">動画長:</span>
            <span className="ml-2">60秒</span>
          </div>
        </div>
      </div>
    </div>
  );
}
