import "server-only";
import { db } from "@/db";
import {
  users,
  videos,
  reservations,
  payments,
  templates,
  VIDEO_STATUS,
  RESERVATION_STATUS,
  PAYMENT_STATUS,
} from "@/db/schema";
import { eq, count, sum, and, gte, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Film, Calendar, Wallet, TrendingUp } from "lucide-react";
import { KPIChart, type DailyStats } from "@/components/admin/kpi-chart";

async function getStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    userCount,
    videoCount,
    completedVideoCount,
    reservationCount,
    confirmedReservationCount,
    completedReservationCount,
    recentRevenue,
    totalRevenue,
    templateCount,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(videos),
    db
      .select({ count: count() })
      .from(videos)
      .where(eq(videos.status, VIDEO_STATUS.COMPLETED)),
    db.select({ count: count() }).from(reservations),
    db
      .select({ count: count() })
      .from(reservations)
      .where(eq(reservations.status, RESERVATION_STATUS.CONFIRMED)),
    db
      .select({ count: count() })
      .from(reservations)
      .where(eq(reservations.status, RESERVATION_STATUS.COMPLETED)),
    db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(
        and(
          eq(payments.status, PAYMENT_STATUS.SUCCEEDED),
          gte(payments.createdAt, thirtyDaysAgo)
        )
      ),
    db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.status, PAYMENT_STATUS.SUCCEEDED)),
    db.select({ count: count() }).from(templates).where(eq(templates.isActive, 1)),
  ]);

  return {
    userCount: userCount[0]?.count || 0,
    videoCount: videoCount[0]?.count || 0,
    completedVideoCount: completedVideoCount[0]?.count || 0,
    reservationCount: reservationCount[0]?.count || 0,
    confirmedReservationCount: confirmedReservationCount[0]?.count || 0,
    completedReservationCount: completedReservationCount[0]?.count || 0,
    recentRevenue: Number(recentRevenue[0]?.total) || 0,
    totalRevenue: Number(totalRevenue[0]?.total) || 0,
    templateCount: templateCount[0]?.count || 0,
  };
}

async function getDailyStats(): Promise<DailyStats[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [videoStats, reservationStats, paymentStats] = await Promise.all([
    db
      .select({
        date: sql<string>`DATE(${videos.createdAt})`.as("date"),
        count: count(),
      })
      .from(videos)
      .where(gte(videos.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${videos.createdAt})`)
      .orderBy(sql`DATE(${videos.createdAt})`),
    db
      .select({
        date: sql<string>`DATE(${reservations.createdAt})`.as("date"),
        count: count(),
      })
      .from(reservations)
      .where(gte(reservations.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${reservations.createdAt})`)
      .orderBy(sql`DATE(${reservations.createdAt})`),
    db
      .select({
        date: sql<string>`DATE(${payments.createdAt})`.as("date"),
        total: sum(payments.amount),
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, PAYMENT_STATUS.SUCCEEDED),
          gte(payments.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`DATE(${payments.createdAt})`)
      .orderBy(sql`DATE(${payments.createdAt})`),
  ]);

  const videoMap = new Map(videoStats.map((v) => [v.date, v.count]));
  const reservationMap = new Map(reservationStats.map((r) => [r.date, r.count]));
  const paymentMap = new Map(paymentStats.map((p) => [p.date, Number(p.total) || 0]));

  const result: DailyStats[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    result.push({
      date: dateStr,
      videos: videoMap.get(dateStr) || 0,
      reservations: reservationMap.get(dateStr) || 0,
      revenue: paymentMap.get(dateStr) || 0,
    });
  }

  return result;
}

export default async function AdminDashboard() {
  const [stats, dailyStats] = await Promise.all([getStats(), getDailyStats()]);

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userCount}</div>
            <p className="text-xs text-muted-foreground">登録ユーザー</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">動画数</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.videoCount}</div>
            <p className="text-xs text-muted-foreground">
              完了: {stats.completedVideoCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">予約数</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="reservation-count">
              {stats.reservationCount}
            </div>
            <p className="text-xs text-muted-foreground">
              確定: {stats.confirmedReservationCount} / 完了: {stats.completedReservationCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">テンプレート</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.templateCount}</div>
            <p className="text-xs text-muted-foreground">有効なテンプレート</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">30日間の売上</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{stats.recentRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              直近30日間の決済完了金額
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累計売上</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{stats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">全期間の決済完了金額</p>
          </CardContent>
        </Card>
      </div>

      <KPIChart data={dailyStats} />
    </div>
  );
}
