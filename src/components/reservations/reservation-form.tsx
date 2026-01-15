"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { format, isBefore, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SlotSelector } from "./slot-selector";
import { CountdownTimer } from "./countdown-timer";
import {
  getAvailableSlots,
  holdSlot,
  releaseSlot,
  getReservationById,
  type SlotInfo,
} from "@/actions/reservation";
import { createCheckoutSession } from "@/actions/payment";
import { Loader2, Calendar as CalendarIcon, AlertCircle, Play, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoWithTemplates } from "@/actions/video";
import type { DayButtonProps } from "react-day-picker";

interface ReservationFormProps {
  videos: VideoWithTemplates[];
  availableDates: string[]; // YYYY-MM-DD形式の投影可能日
}

export function ReservationForm({
  videos,
  availableDates,
}: ReservationFormProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // 仮押さえ状態
  const [holdReservationId, setHoldReservationId] = useState<number | null>(
    null
  );
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);

  const [error, setError] = useState<string | null>(null);

  // 完成した動画のみ選択可能
  const completedVideos = videos.filter((v) => v.status === "completed");

  // キャンセル時のメッセージ
  const paymentCancelled = searchParams.get("payment") === "cancelled";

  // 選択可能な日付
  const availableDateSet = new Set(availableDates);
  const today = startOfDay(new Date());

  // 日付選択時にスロットを取得
  const handleDateSelect = useCallback(async (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);

    if (!date) return;

    setIsLoadingSlots(true);
    setError(null);

    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const result = await getAvailableSlots(dateStr);

      if (result.available) {
        setSlots(result.slots);
      } else {
        setError("この日は投影スケジュールがありません");
      }
    } catch {
      setError("スロット情報の取得に失敗しました");
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  // 仮押さえ
  const handleHoldSlot = async () => {
    if (!selectedDate || !selectedSlot || !selectedVideoId) {
      setError("日付、時間、動画を選択してください");
      return;
    }

    setError(null);

    startTransition(async () => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const result = await holdSlot({
        videoId: selectedVideoId,
        date: dateStr,
        slotNumber: selectedSlot,
      });

      if (result.success) {
        setHoldReservationId(result.reservation.id);
        setHoldExpiresAt(result.reservation.holdExpiresAt || null);

        // スロット状態を更新
        handleDateSelect(selectedDate);
      } else {
        setError(result.error);
      }
    });
  };

  // 仮押さえ解放
  const handleReleaseSlot = async () => {
    if (!holdReservationId) return;

    startTransition(async () => {
      const result = await releaseSlot(holdReservationId);

      if (result.success) {
        setHoldReservationId(null);
        setHoldExpiresAt(null);
        // スロット状態を更新
        if (selectedDate) {
          handleDateSelect(selectedDate);
        }
      } else {
        setError(result.error);
      }
    });
  };

  // 決済に進む
  const handleProceedToPayment = async () => {
    if (!holdReservationId) return;

    setError(null);

    startTransition(async () => {
      const result = await createCheckoutSession(holdReservationId);

      if (result.success) {
        window.location.href = result.checkoutUrl;
      } else {
        setError(result.error);
      }
    });
  };

  // 期限切れ時の処理
  const handleExpire = useCallback(() => {
    setHoldReservationId(null);
    setHoldExpiresAt(null);
    setError("仮押さえの期限が切れました。再度選択してください。");
    if (selectedDate) {
      handleDateSelect(selectedDate);
    }
  }, [selectedDate, handleDateSelect]);

  // 初期動画選択
  useEffect(() => {
    if (completedVideos.length > 0 && !selectedVideoId) {
      setSelectedVideoId(completedVideos[0].id);
    }
  }, [completedVideos, selectedVideoId]);

  // 決済キャンセル時の仮押さえ状態復元（一度だけ実行）
  const didRestoreRef = useRef(false);
  const reservationIdParam = searchParams.get("reservationId");

  useEffect(() => {
    // 既に復元済み、またはキャンセルでない場合はスキップ
    if (didRestoreRef.current || !paymentCancelled || !reservationIdParam) {
      return;
    }

    const reservationId = parseInt(reservationIdParam, 10);
    if (isNaN(reservationId)) return;

    // 復元処理開始をマーク（二重実行防止）
    didRestoreRef.current = true;

    let cancelled = false;

    const restoreHold = async () => {
      try {
        const reservation = await getReservationById(reservationId);

        if (cancelled) return;

        if (reservation && reservation.status === "hold" && reservation.holdExpiresAt) {
          const expiresAt = new Date(reservation.holdExpiresAt);
          // 期限切れチェック
          if (expiresAt > new Date()) {
            setHoldReservationId(reservation.id);
            setHoldExpiresAt(expiresAt);
            setSelectedVideoId(reservation.videoId);
          } else {
            setError("仮押さえの期限が切れました。再度選択してください。");
          }
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to restore hold:", error);
        setError("仮押さえ情報の復元に失敗しました。再度選択してください。");
      }
    };

    restoreHold();

    return () => {
      cancelled = true;
    };
  }, [paymentCancelled, reservationIdParam]);

  const CalendarDayButton = (props: DayButtonProps) => {
    const { day, modifiers, ...buttonProps } = props;
    void day;
    void modifiers;
    return (
      <button
        {...buttonProps}
        data-testid={!buttonProps.disabled ? "available-date" : undefined}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* キャンセル時のメッセージ */}
      {paymentCancelled && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            決済がキャンセルされました。仮押さえは維持されています。
          </AlertDescription>
        </Alert>
      )}

      {/* 動画選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
              1
            </span>
            投影する動画を選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedVideos.length === 0 ? (
            <Alert>
              <AlertDescription>
                完成した動画がありません。先に動画を作成してください。
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {completedVideos.map((video) => {
                const isSelected = selectedVideoId === video.id;
                const thumbnailUrl = video.template1?.resolvedThumbnailUrl;

                return (
                  <div
                    key={video.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "cursor-pointer rounded-lg overflow-hidden border transition-all",
                      isSelected
                        ? "ring-2 ring-primary border-primary"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setSelectedVideoId(video.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedVideoId(video.id);
                      }
                    }}
                  >
                    <div className="aspect-video bg-black/40 relative overflow-hidden">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={`動画 #${video.id}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-8 w-8 text-white/30" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 text-center bg-background/80">
                      <span className="text-sm font-medium">動画 #{video.id}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 日付選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
              2
            </span>
            投影日を選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={ja}
            modifiers={{
              available: (date) => {
                const dateStr = format(date, "yyyy-MM-dd");
                return availableDateSet.has(dateStr) && !isBefore(date, today);
              },
            }}
            modifiersClassNames={{
              available: "bg-primary/20 text-primary font-semibold ring-1 ring-primary/30",
            }}
            disabled={(date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              return (
                isBefore(date, today) || !availableDateSet.has(dateStr)
              );
            }}
            className="calendar rounded-md border"
            data-testid="calendar"
            components={{ DayButton: CalendarDayButton }}
          />
          {selectedDate && (
            <p className="mt-2 text-sm text-muted-foreground">
              選択中: {format(selectedDate, "yyyy年M月d日(E)", { locale: ja })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* スロット選択 */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
                3
              </span>
              時間を選択
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : slots.length > 0 ? (
              <SlotSelector
                slots={slots}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
                disabled={isPending || holdReservationId !== null}
              />
            ) : (
              <p className="text-center text-muted-foreground py-4">
                この日のスロット情報がありません
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 仮押さえ中のカウントダウン */}
      {holdReservationId && holdExpiresAt && (
        <CountdownTimer expiresAt={holdExpiresAt} onExpire={handleExpire} />
      )}

      {/* アクションボタン */}
      <div className="flex flex-col gap-3">
        {!holdReservationId ? (
          <Button
            size="lg"
            onClick={handleHoldSlot}
            disabled={
              isPending ||
              !selectedDate ||
              !selectedSlot ||
              !selectedVideoId ||
              completedVideos.length === 0
            }
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                処理中...
              </>
            ) : (
              <>
                <CalendarIcon className="h-4 w-4 mr-2" />
                仮押さえする
              </>
            )}
          </Button>
        ) : (
          <>
            <Button size="lg" onClick={handleProceedToPayment} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  処理中...
                </>
              ) : (
                "決済に進む（¥5,000）"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleReleaseSlot}
              disabled={isPending}
            >
              仮押さえをキャンセル
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
