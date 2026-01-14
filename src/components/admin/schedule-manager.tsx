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
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Trash2,
  Eye,
  EyeOff,
  CalendarPlus,
} from "lucide-react";
import type { ProjectionSchedule } from "@/db/schema";
import {
  createSchedule,
  deleteSchedule,
  toggleScheduleActive,
} from "@/actions/admin";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";

interface ScheduleManagerProps {
  schedules: ProjectionSchedule[];
}

export function ScheduleManager({ schedules }: ScheduleManagerProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] =
    useState<ProjectionSchedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = startOfDay(new Date());

  // 過去/将来で分離
  const futureSchedules = schedules.filter(
    (s) => !isBefore(parseISO(s.date), today)
  );
  const pastSchedules = schedules.filter((s) =>
    isBefore(parseISO(s.date), today)
  );

  // 既に登録されている日付
  const existingDates = schedules.map((s) => s.date);

  const handleCreate = async () => {
    if (!selectedDate) return;
    setIsSubmitting(true);
    setError(null);

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const result = await createSchedule(dateStr);

    if (result.success) {
      setCreateDialogOpen(false);
      setSelectedDate(undefined);
      router.refresh();
    } else {
      setError(result.error || "エラーが発生しました");
    }

    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedSchedule) return;
    setIsSubmitting(true);
    setError(null);

    const result = await deleteSchedule(selectedSchedule.id);

    if (result.success) {
      setDeleteDialogOpen(false);
      router.refresh();
    } else {
      setError(result.error || "削除に失敗しました");
    }

    setIsSubmitting(false);
  };

  const handleToggleActive = async (schedule: ProjectionSchedule) => {
    await toggleScheduleActive(schedule.id, !schedule.isActive);
    router.refresh();
  };

  const ScheduleTable = ({
    items,
    title,
  }: {
    items: ProjectionSchedule[];
    title: string;
  }) => (
    <div>
      <h2 className="text-lg font-semibold mb-3">
        {title} ({items.length})
      </h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日付</TableHead>
            <TableHead>曜日</TableHead>
            <TableHead>スロット</TableHead>
            <TableHead>状態</TableHead>
            <TableHead className="w-20">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                スケジュールがありません
              </TableCell>
            </TableRow>
          ) : (
            items.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>
                  {format(parseISO(schedule.date), "yyyy/MM/dd")}
                </TableCell>
                <TableCell>
                  {format(parseISO(schedule.date), "E", { locale: ja })}
                </TableCell>
                <TableCell>
                  {schedule.slotsConfig?.slots?.length || 4}枠
                </TableCell>
                <TableCell>
                  <Badge variant={schedule.isActive ? "default" : "secondary"}>
                    {schedule.isActive ? "有効" : "無効"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleToggleActive(schedule)}
                      >
                        {schedule.isActive ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            無効化
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            有効化
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setError(null);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          スケジュール追加
        </Button>
      </div>

      <div className="space-y-8">
        <ScheduleTable items={futureSchedules} title="今後のスケジュール" />
        {pastSchedules.length > 0 && (
          <ScheduleTable items={pastSchedules} title="過去のスケジュール" />
        )}
      </div>

      {/* 作成ダイアログ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-fit">
          <DialogHeader>
            <DialogTitle>投影スケジュール追加</DialogTitle>
            <DialogDescription>
              投影可能な日付を選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) =>
                isBefore(date, today) ||
                existingDates.includes(format(date, "yyyy-MM-dd"))
              }
              locale={ja}
              className="rounded-md border"
            />
            {selectedDate && (
              <p className="mt-4 text-sm text-center">
                選択日: {format(selectedDate, "yyyy年MM月dd日 (E)", { locale: ja })}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setSelectedDate(undefined);
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !selectedDate}
            >
              {isSubmitting ? "追加中..." : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スケジュールを削除</DialogTitle>
            <DialogDescription>
              {selectedSchedule &&
                format(parseISO(selectedSchedule.date), "yyyy年MM月dd日 (E)", {
                  locale: ja,
                })}
              のスケジュールを削除してもよろしいですか？
              <span className="block mt-2 text-sm">
                有効な予約がある場合は削除できません。
              </span>
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
