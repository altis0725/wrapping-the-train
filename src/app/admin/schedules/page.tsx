import "server-only";
import { getSchedules } from "@/actions/admin";
import { ScheduleManager } from "@/components/admin/schedule-manager";

export default async function SchedulesPage() {
  const schedules = await getSchedules();

  return (
    <div className="space-y-6" data-testid="schedule-calendar">
      <h1 className="text-2xl font-bold">投影スケジュール管理</h1>
      <ScheduleManager schedules={schedules} />
    </div>
  );
}
