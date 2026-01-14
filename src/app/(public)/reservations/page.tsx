import "server-only";

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifySession } from "@/lib/auth/session";
import { COOKIE_NAME } from "@/lib/auth/constants";
import { getUserVideos } from "@/actions/video";
import { db } from "@/db";
import { projectionSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { Skeleton } from "@/components/ui/skeleton";
import { cookies } from "next/headers";

export const metadata = {
  title: "投影予約 | WRAPPING THE TRAIN",
  description: "プロジェクションマッピングの投影日時を予約",
};

async function getAvailableDates(): Promise<string[]> {
  const today = new Date().toISOString().split("T")[0];

  const schedules = await db
    .select()
    .from(projectionSchedules)
    .where(eq(projectionSchedules.isActive, true));

  // 今日以降の日付をフィルタ
  return schedules
    .map((s) => s.date)
    .filter((date) => date >= today);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[200px] w-full" />
      <Skeleton className="h-[300px] w-full" />
      <Skeleton className="h-[150px] w-full" />
    </div>
  );
}

export default async function ReservationsPage() {
  // セッション検証（middlewareで既にチェック済みだが念のため）
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);

  if (!session) {
    redirect("/login?callbackUrl=/reservations");
  }

  const [videos, availableDates] = await Promise.all([
    getUserVideos(),
    getAvailableDates(),
  ]);

  return (
    <main className="container max-w-2xl py-8">
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">投影予約</h1>
          <p className="text-muted-foreground">
            水間鉄道でのプロジェクションマッピング投影を予約
          </p>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <ReservationForm videos={videos} availableDates={availableDates} />
        </Suspense>
      </div>
    </main>
  );
}
