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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, CheckCircle2, XCircle, Filter } from "lucide-react";
import { RESERVATION_STATUS } from "@/db/schema";
import {
  markReservationCompleted,
  adminCancelReservation,
  type ReservationWithUser,
} from "@/actions/admin";
import { getSlotTimeRange } from "@/lib/constants/slot";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

interface ReservationManagerProps {
  reservations: ReservationWithUser[];
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  [RESERVATION_STATUS.HOLD]: { label: "仮押さえ", variant: "secondary" },
  [RESERVATION_STATUS.CONFIRMED]: { label: "確定", variant: "default" },
  [RESERVATION_STATUS.COMPLETED]: { label: "投影完了", variant: "outline" },
  [RESERVATION_STATUS.CANCELLED]: { label: "キャンセル", variant: "destructive" },
  [RESERVATION_STATUS.EXPIRED]: { label: "期限切れ", variant: "destructive" },
};

export function ReservationManager({
  reservations: initialReservations,
}: ReservationManagerProps) {
  const router = useRouter();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationWithUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フィルター
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // フィルター適用
  const filteredReservations = initialReservations.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (dateFrom && r.projectionDate < dateFrom) return false;
    if (dateTo && r.projectionDate > dateTo) return false;
    return true;
  });

  const handleMarkCompleted = async () => {
    if (!selectedReservation) return;
    setIsSubmitting(true);
    setError(null);

    const result = await markReservationCompleted(selectedReservation.id);

    if (result.success) {
      setConfirmDialogOpen(false);
      router.refresh();
    } else {
      setError(result.error || "エラーが発生しました");
    }

    setIsSubmitting(false);
  };

  const handleCancel = async () => {
    if (!selectedReservation) return;
    setIsSubmitting(true);
    setError(null);

    const result = await adminCancelReservation(selectedReservation.id);

    if (result.success) {
      setCancelDialogOpen(false);
      router.refresh();
    } else {
      setError(result.error || "エラーが発生しました");
    }

    setIsSubmitting(false);
  };

  return (
    <>
      {/* フィルター */}
      <div className="flex flex-wrap gap-4 mb-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">フィルター</span>
        </div>
        <div className="flex-1 flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label className="text-xs">ステータス</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value={RESERVATION_STATUS.HOLD}>仮押さえ</SelectItem>
                <SelectItem value={RESERVATION_STATUS.CONFIRMED}>確定</SelectItem>
                <SelectItem value={RESERVATION_STATUS.COMPLETED}>完了</SelectItem>
                <SelectItem value={RESERVATION_STATUS.CANCELLED}>キャンセル</SelectItem>
                <SelectItem value={RESERVATION_STATUS.EXPIRED}>期限切れ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">期間（開始）</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">期間（終了）</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
            >
              リセット
            </Button>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>投影日</TableHead>
              <TableHead>スロット</TableHead>
              <TableHead>ユーザー</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead className="w-20">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  予約がありません
                </TableCell>
              </TableRow>
            ) : (
              filteredReservations.map((reservation) => {
                const status = statusConfig[reservation.status] || {
                  label: reservation.status,
                  variant: "secondary" as const,
                };
                const canComplete =
                  reservation.status === RESERVATION_STATUS.CONFIRMED;
                const canCancel =
                  reservation.status === RESERVATION_STATUS.HOLD ||
                  reservation.status === RESERVATION_STATUS.CONFIRMED;

                return (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      {format(parseISO(reservation.projectionDate), "yyyy/MM/dd (E)", {
                        locale: ja,
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        スロット{reservation.slotNumber}
                      </span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {getSlotTimeRange(reservation.slotNumber)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {reservation.user ? (
                        <>
                          <div className="font-medium">
                            {reservation.user.name || "(名前なし)"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {reservation.user.email || "-"}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(reservation.createdAt), "yyyy/MM/dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      {(canComplete || canCancel) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canComplete && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedReservation(reservation);
                                  setError(null);
                                  setConfirmDialogOpen(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                投影完了
                              </DropdownMenuItem>
                            )}
                            {canCancel && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedReservation(reservation);
                                  setError(null);
                                  setCancelDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                キャンセル
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 完了確認ダイアログ */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>投影完了マーク</DialogTitle>
            <DialogDescription>
              この予約を投影完了としてマークしてもよろしいですか？
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleMarkCompleted} disabled={isSubmitting}>
              {isSubmitting ? "処理中..." : "完了マーク"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* キャンセル確認ダイアログ */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約をキャンセル</DialogTitle>
            <DialogDescription>
              この予約を強制キャンセルしてもよろしいですか？
              {selectedReservation?.status === RESERVATION_STATUS.CONFIRMED && (
                <span className="block mt-2 text-sm font-medium text-destructive">
                  確定済みの予約のため、返金処理が行われます。
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              戻る
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
              {isSubmitting ? "処理中..." : "キャンセル実行"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
