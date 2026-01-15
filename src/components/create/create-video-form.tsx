"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "./step-indicator";
import { TemplateGrid } from "./template-grid";
import { VideoPreview } from "./video-preview";
import { SegmentTransition } from "./segment-transition";
import { useVideoStatus } from "./use-video-status";
import { createVideo, retryVideo } from "@/actions/video";
import { VIDEO_STATUS } from "@/db/schema";
import type { TemplateWithResolvedThumbnail } from "@/actions/template";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";

const STEPS = [
  { label: "背景", description: "背景の映像を選択" },
  { label: "窓", description: "窓の映像を選択" },
  { label: "車輪", description: "車輪の映像を選択" },
];

const SEGMENT_COUNT = 3;

interface CreateVideoFormProps {
  templates: {
    background: TemplateWithResolvedThumbnail[];
    window: TemplateWithResolvedThumbnail[];
    wheel: TemplateWithResolvedThumbnail[];
  };
}

type Step = 0 | 1 | 2;

// セグメントの選択状態
interface SegmentSelection {
  background: TemplateWithResolvedThumbnail | null;
  window: TemplateWithResolvedThumbnail | null;
  wheel: TemplateWithResolvedThumbnail | null;
}

// フェーズ: selection（テンプレート選択中）、transition（セグメント遷移画面）、complete（全選択完了）
type Phase = "selection" | "transition" | "complete";

export function CreateVideoForm({ templates }: CreateVideoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // セグメント状態管理
  const [currentSegment, setCurrentSegment] = useState(0); // 0, 1, 2
  const [segments, setSegments] = useState<SegmentSelection[]>([
    { background: null, window: null, wheel: null },
    { background: null, window: null, wheel: null },
    { background: null, window: null, wheel: null },
  ]);

  // 各セグメント内のステップ
  const [currentStep, setCurrentStep] = useState<Step>(0);

  // フェーズ管理
  const [phase, setPhase] = useState<Phase>("selection");

  const [createdVideoId, setCreatedVideoId] = useState<number | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // 動画ステータスのポーリング
  const { status, videoUrl, error, canRetry } = useVideoStatus({
    videoId: createdVideoId,
    enabled: createdVideoId !== null,
  });

  // 現在のセグメントの選択状態を取得
  const currentSelection = segments[currentSegment];

  // 現在のステップのテンプレート一覧を取得
  const getCurrentTemplates = (): TemplateWithResolvedThumbnail[] => {
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
        return currentSelection.background?.id ?? null;
      case 1:
        return currentSelection.window?.id ?? null;
      case 2:
        return currentSelection.wheel?.id ?? null;
      default:
        return null;
    }
  };

  // テンプレート選択ハンドラ
  const handleSelectTemplate = useCallback(
    (template: TemplateWithResolvedThumbnail) => {
      setSegments((prev) => {
        const newSegments = [...prev];
        const currentSeg = { ...newSegments[currentSegment] };

        switch (currentStep) {
          case 0:
            currentSeg.background = template;
            break;
          case 1:
            currentSeg.window = template;
            break;
          case 2:
            currentSeg.wheel = template;
            break;
        }

        newSegments[currentSegment] = currentSeg;
        return newSegments;
      });
    },
    [currentSegment, currentStep]
  );

  // 完了したステップの配列（現在のセグメント内）
  const getCompletedSteps = (): number[] => {
    const completed: number[] = [];
    if (currentSelection.background) completed.push(0);
    if (currentSelection.window) completed.push(1);
    if (currentSelection.wheel) completed.push(2);
    return completed;
  };

  // 次へ進めるかどうか
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return currentSelection.background !== null;
      case 1:
        return currentSelection.window !== null;
      case 2:
        return currentSelection.wheel !== null;
      default:
        return false;
    }
  };

  // 次へボタンのハンドラ
  const handleNext = () => {
    if (currentStep < 2) {
      // セグメント内の次のステップへ
      setCurrentStep((prev) => (prev + 1) as Step);
    } else {
      // セグメント完了
      if (currentSegment < SEGMENT_COUNT - 1) {
        // 次のセグメントへの遷移画面を表示
        // currentSegmentを+1してから遷移画面を表示（previousSelectionが正しく参照できるように）
        setCurrentSegment((prev) => prev + 1);
        setPhase("transition");
      } else {
        // 全セグメント完了
        setPhase("complete");
      }
    }
  };

  // 戻るボタンのハンドラ
  const handleBack = () => {
    if (currentStep > 0) {
      // セグメント内の前のステップへ
      setCurrentStep((prev) => (prev - 1) as Step);
    } else if (currentSegment > 0) {
      // 前のセグメントの最終ステップへ
      setCurrentSegment((prev) => prev - 1);
      setCurrentStep(2);
      setPhase("selection");
    }
  };

  // 「前と同じ」ボタンのハンドラ
  // 注: transition画面表示時点でcurrentSegmentは既に+1されている
  const handleCopyPrevious = () => {
    const prevSegment = segments[currentSegment - 1];
    setSegments((prev) => {
      const newSegments = [...prev];
      newSegments[currentSegment] = { ...prevSegment };
      return newSegments;
    });

    if (currentSegment < SEGMENT_COUNT - 1) {
      // 次のセグメントへの遷移画面を表示
      setCurrentSegment((prev) => prev + 1);
      setCurrentStep(0);
      // transitionのまま（次のセグメントの遷移画面を表示）
    } else {
      // 全セグメント完了
      setPhase("complete");
    }
  };

  // 「新しく選ぶ」ボタンのハンドラ
  // 注: transition画面表示時点でcurrentSegmentは既に+1されている
  const handleSelectNew = () => {
    // currentSegmentは既に次のセグメントを指しているので、そのまま選択画面へ
    setCurrentStep(0);
    setPhase("selection");
  };

  // 動画作成
  const handleCreateVideo = async () => {
    // 全セグメントの選択が完了しているか確認
    const allSelected = segments.every(
      (seg) => seg.background && seg.window && seg.wheel
    );

    if (!allSelected) {
      setCreateError("すべてのテンプレートを選択してください");
      return;
    }

    setCreateError(null);

    startTransition(async () => {
      const result = await createVideo({
        segments: segments.map((seg) => ({
          template1Id: seg.background!.id,
          template2Id: seg.window!.id,
          template3Id: seg.wheel!.id,
        })),
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
              しばらくお待ちください（1〜2分程度）
            </p>
          )}
        </div>

        {/* プログレス表示（ARIA属性追加） */}
        {isProcessing && (
          <div className="max-w-md mx-auto space-y-2">
            <Progress
              value={undefined}
              className="animate-pulse"
              aria-label="動画生成中"
            />
            <p className="text-sm text-center text-muted-foreground" aria-hidden="true">
              処理中...
            </p>
          </div>
        )}

        {/* プレビュー（セグメント1のみ表示） */}
        <div className="max-w-2xl mx-auto">
          <VideoPreview
            selectedTemplates={{
              background: segments[0].background,
              window: segments[0].window,
              wheel: segments[0].wheel,
            }}
            isGenerating={isProcessing}
            generatedVideoUrl={videoUrl}
          />
        </div>

        {/* エラー表示（role="alert"でスクリーンリーダーに即座に通知） */}
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

  // セグメント遷移画面
  // 注: この時点でcurrentSegmentは「これから選択するセグメント」を指している
  if (phase === "transition") {
    const previousSelection = currentSegment > 0 ? segments[currentSegment - 1] : null;

    // 安全ガード: previousSelectionがない場合（論理的にはありえないが防御的に）
    // render中のstate更新を避けるため、nullを返してuseEffect等で処理する代わりに
    // エラー状態として表示（実際には発生しない）
    if (!previousSelection) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      );
    }

    return (
      <SegmentTransition
        currentSegment={currentSegment}
        previousSelection={previousSelection}
        onCopyPrevious={handleCopyPrevious}
        onSelectNew={handleSelectNew}
        onBack={() => {
          // 前のセグメントに戻る
          setCurrentSegment((prev) => prev - 1);
          setCurrentStep(2);
          setPhase("selection");
        }}
      />
    );
  }

  // 全セグメント完了確認画面
  if (phase === "complete") {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">選択完了</h2>
          <p className="text-muted-foreground">
            3セグメント（30秒）の動画を作成します
          </p>
        </div>

        {/* セグメントプレビュー */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {segments.map((seg, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h3 className="font-medium mb-2 text-center">
                セグメント {index + 1}
              </h3>
              <VideoPreview
                selectedTemplates={{
                  background: seg.background,
                  window: seg.window,
                  wheel: seg.wheel,
                }}
              />
            </div>
          ))}
        </div>

        {/* エラー表示 */}
        {createError && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
            {createError}
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentSegment(SEGMENT_COUNT - 1);
              setCurrentStep(2);
              setPhase("selection");
            }}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <Button onClick={handleCreateVideo} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                作成中...
              </>
            ) : (
              "動画を作成"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // テンプレート選択UI
  return (
    <div className="space-y-8">
      {/* セグメント・ステップインジケーター */}
      <div className="space-y-4">
        {/* セグメントインジケーター（セマンティックHTML + ARIA属性） */}
        <nav aria-label="セグメント進捗">
          <ol className="flex justify-center items-center gap-2 text-sm list-none p-0 m-0">
            {Array.from({ length: SEGMENT_COUNT }).map((_, index) => (
              <li key={index}>
                <div
                  className={`px-3 py-1 rounded-full ${
                    index === currentSegment
                      ? "bg-primary text-primary-foreground"
                      : index < currentSegment
                        ? "bg-primary/30 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                  aria-current={index === currentSegment ? "step" : undefined}
                  aria-label={`セグメント ${index + 1}${
                    index === currentSegment
                      ? " (現在)"
                      : index < currentSegment
                        ? " (完了)"
                        : ""
                  }`}
                >
                  {index + 1}
                </div>
              </li>
            ))}
          </ol>
          <p className="sr-only" aria-live="polite">
            セグメント {currentSegment + 1} / {SEGMENT_COUNT}
          </p>
          <span className="ml-2 text-muted-foreground" aria-hidden="true">
            セグメント {currentSegment + 1} / {SEGMENT_COUNT}
          </span>
        </nav>

        {/* ステップインジケーター */}
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={getCompletedSteps()}
        />
      </div>

      {/* メインコンテンツ */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* 左: プレビュー */}
        <div className="order-2 md:order-1">
          <div className="sticky top-4">
            <h3 className="font-medium mb-4">プレビュー</h3>
            <VideoPreview
              selectedTemplates={{
                background: currentSelection.background,
                window: currentSelection.window,
                wheel: currentSelection.wheel,
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
          onClick={handleBack}
          disabled={currentStep === 0 && currentSegment === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>

        <Button onClick={handleNext} disabled={!canProceed()}>
          次へ
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
