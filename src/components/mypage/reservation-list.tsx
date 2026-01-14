"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, XCircle, AlertCircle, Clock } from "lucide-react";
import type { Reservation } from "@/db/schema";
import { RESERVATION_STATUS } from "@/db/schema";
import { cancelReservation } from "@/actions/reservation";
import {
  getSlotTimeRange,
  CANCEL_DEADLINE_HOURS,
} from "@/lib/constants/slot";
import { format, parseISO, isBefore, subHours, set } from "date-fns";
import { ja } from "date-fns/locale";
import { getSlotStartTime } from "@/lib/constants/slot";

interface ReservationListProps {
  reservations: Reservation[];
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  [RESERVATION_STATUS.HOLD]: { label: "仮押さえ中", variant: "secondary" },
  [RESERVATION_STATUS.CONFIRMED]: { label: "確定", variant: "default" },
  [RESERVATION_STATUS.COMPLETED]: { label: "投影完了", variant: "outline" },
  [RESERVATION_STATUS.CANCELLED]: { label: "キャンセル", variant: "destructive" },
  [RESERVATION_STATUS.EXPIRED]: { label: "期限切れ", variant: "destructive" },
};

function canCancelReservation(reservation: Reservation): boolean {
  if (
    reservation.status !== RESERVATION_STATUS.HOLD &&
    reservation.status !== RESERVATION_STATUS.CONFIRMED
  ) {
    return false;
  }

  if (reservation.status === RESERVATION_STATUS.CONFIRMED) {
    const projectionDate = parseISO(reservation.projectionDate);
    const slotTime = getSlotStartTime(reservation.slotNumber);
    const [hours, minutes] = slotTime.split(":").map(Number);
    const projectionStart = set(projectionDate, {
      hours,
      minutes,
      seconds: 0,
      milliseconds: 0,
    });
    const deadline = subHours(projectionStart, CANCEL_DEADLINE_HOURS);
    return isBefore(new Date(), deadline);
  }

  return true;
}

function getCancelDeadline(reservation: Reservation): Date | null {
  if (reservation.status !== RESERVATION_STATUS.CONFIRMED) {
    return null;
  }
  const projectionDate = parseISO(reservation.projectionDate);
  const slotTime = getSlotStartTime(reservation.slotNumber);
  const [hours, minutes] = slotTime.split(":").map(Number);
  const projectionStart = set(projectionDate, {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
  return subHours(projectionStart, CANCEL_DEADLINE_HOURS);
}

export function ReservationList({ reservations }: ReservationListProps) {
  const router = useRouter();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancelClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setCancelError(null);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedReservation) return;

    setIsCancelling(true);
    const result = await cancelReservation(selectedReservation.id);

    if (result.success) {
      setCancelDialogOpen(false);
      router.refresh();
    } else {
      setCancelError(result.error);
    }
    setIsCancelling(false);
  };

  // 表示順: confirmed → hold → completed → expired/cancelled
  const sortedReservations = [...reservations].sort((a, b) => {
    const order: Record<string, number> = {
      [RESERVATION_STATUS.CONFIRMED]: 0,
      [RESERVATION_STATUS.HOLD]: 1,
      [RESERVATION_STATUS.COMPLETED]: 2,
      [RESERVATION_STATUS.EXPIRED]: 3,
      [RESERVATION_STATUS.CANCELLED]: 4,
    };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  if (reservations.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">予約がありません</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          動画を作成して予約してみましょう
        </p>
        <Button className="mt-4" onClick={() => router.push("/create")}>
          動画を作成する
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* モバイル表示 */}
      <div className="space-y-4 md:hidden">
        {sortedReservations.map((reservation) => {
          const status = statusConfig[reservation.status] || {
            label: reservation.status,
            variant: "secondary" as const,
          };
          const canCancel = canCancelReservation(reservation);
          const deadline = getCancelDeadline(reservation);

          return (
            <div
              key={reservation.id}
              data-testid="reservation-item"
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {format(parseISO(reservation.projectionDate), "yyyy/MM/dd (E)", {
                      locale: ja,
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    スロット{reservation.slotNumber}: {getSlotTimeRange(reservation.slotNumber)}
                  </p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              {deadline && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    キャンセル期限: {format(deadline, "yyyy/MM/dd HH:mm")}
                  </span>
                </div>
              )}

              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancelClick(reservation)}
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  キャンセル
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* デスクトップ表示 */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>投影日</TableHead>
              <TableHead>スロット</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>キャンセル期限</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedReservations.map((reservation) => {
              const status = statusConfig[reservation.status] || {
                label: reservation.status,
                variant: "secondary" as const,
              };
              const canCancel = canCancelReservation(reservation);
              const deadline = getCancelDeadline(reservation);

              return (
                <TableRow key={reservation.id} data-testid="reservation-item">
                  <TableCell>
                    {format(parseISO(reservation.projectionDate), "yyyy/MM/dd (E)", {
                      locale: ja,
                    })}
                  </TableCell>
                  <TableCell>
                    スロット{reservation.slotNumber}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {getSlotTimeRange(reservation.slotNumber)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {deadline ? (
                      <span className="text-sm">
                        {format(deadline, "yyyy/MM/dd HH:mm")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelClick(reservation)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        キャンセル
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約をキャンセル</DialogTitle>
            <DialogDescription>
              この予約をキャンセルしてもよろしいですか？
              {selectedReservation?.status === RESERVATION_STATUS.CONFIRMED && (
                <span className="block mt-2 text-sm">
                  確定済みの予約をキャンセルすると返金処理が行われます。
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {cancelError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{cancelError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              戻る
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? "処理中..." : "キャンセルする"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
