"use server";

import { db } from "@/db";
import {
  templates,
  reservations,
  payments,
  projectionSchedules,
  videos,
  users,
  adminAuditLogs,
  RESERVATION_STATUS,
  PAYMENT_STATUS,
  type Template,
  type Reservation,
  type ProjectionSchedule,
  type AdminAuditLog,
} from "@/db/schema";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminOpenId } from "@/lib/auth/admin";
import { getStripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";

// 監査ログ記録
async function logAuditAction(
  adminUserId: number,
  action: string,
  entity: string,
  entityId?: number,
  details?: Record<string, unknown>
) {
  try {
    await db.insert(adminAuditLogs).values({
      adminUserId,
      action,
      entity,
      entityId: entityId || null,
      details: details || null,
    });
  } catch (error) {
    console.error("[logAuditAction] Failed to log audit:", error);
  }
}

// Admin権限チェック (複数管理者対応 - SSOTはsrc/lib/auth/admin.ts)
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("認証が必要です");
  }
  if (!isAdminOpenId(user.openId)) {
    throw new Error("管理者権限が必要です");
  }
  return user;
}

// ============================================================================
// テンプレート管理
// ============================================================================

export type TemplateInput = {
  category: number;
  title: string;
  videoUrl?: string;
  storageKey?: string;
  thumbnailUrl?: string;
  displayOrder?: number;
};

export async function getTemplates(): Promise<Template[]> {
  await requireAdmin();
  return db.select().from(templates).orderBy(asc(templates.category), asc(templates.displayOrder));
}

export async function createTemplate(input: TemplateInput): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    // 動画ソースのバリデーション（videoUrl または storageKey のどちらかが必要）
    if (!input.title || !input.category) {
      return { success: false, error: "必須項目が不足しています" };
    }

    if (!input.videoUrl && !input.storageKey) {
      return { success: false, error: "動画URLまたはストレージキーが必要です" };
    }

    if (![1, 2, 3].includes(input.category)) {
      return { success: false, error: "カテゴリが不正です" };
    }

    const [newTemplate] = await db.insert(templates).values({
      category: input.category,
      title: input.title,
      videoUrl: input.videoUrl || null,
      storageKey: input.storageKey || null,
      thumbnailUrl: input.thumbnailUrl || null,
      displayOrder: input.displayOrder || 0,
      isActive: 1,
    }).returning();

    await logAuditAction(admin.id, "CREATE", "template", newTemplate.id, {
      title: input.title,
      category: input.category,
      hasStorageKey: !!input.storageKey,
    });

    revalidatePath("/admin/templates");
    return { success: true };
  } catch (error) {
    console.error("[createTemplate] Error:", error);
    return { success: false, error: "テンプレートの作成に失敗しました" };
  }
}

export async function updateTemplate(
  id: number,
  input: Partial<TemplateInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    const updateData: Partial<Template> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.videoUrl !== undefined) updateData.videoUrl = input.videoUrl || null;
    if (input.storageKey !== undefined) updateData.storageKey = input.storageKey || null;
    if (input.thumbnailUrl !== undefined) updateData.thumbnailUrl = input.thumbnailUrl || null;
    if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
    if (input.category !== undefined) {
      if (![1, 2, 3].includes(input.category)) {
        return { success: false, error: "カテゴリが不正です" };
      }
      updateData.category = input.category;
    }

    await db.update(templates).set(updateData).where(eq(templates.id, id));
    await logAuditAction(admin.id, "UPDATE", "template", id, {
      ...input,
      hasStorageKey: !!input.storageKey,
    });

    revalidatePath("/admin/templates");
    return { success: true };
  } catch (error) {
    console.error("[updateTemplate] Error:", error);
    return { success: false, error: "テンプレートの更新に失敗しました" };
  }
}

export async function deleteTemplate(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    // 使用中のテンプレートかチェック（動画に紐付いているか）
    const usedInVideos = await db
      .select({ count: sql<number>`count(*)` })
      .from(videos)
      .where(
        sql`${videos.template1Id} = ${id} OR ${videos.template2Id} = ${id} OR ${videos.template3Id} = ${id}`
      );

    const isLogicalDelete = usedInVideos[0]?.count && usedInVideos[0].count > 0;

    if (isLogicalDelete) {
      // 論理削除（非アクティブ化）
      await db.update(templates).set({ isActive: 0 }).where(eq(templates.id, id));
    } else {
      // 物理削除
      await db.delete(templates).where(eq(templates.id, id));
    }

    await logAuditAction(admin.id, "DELETE", "template", id, { logical: isLogicalDelete });

    revalidatePath("/admin/templates");
    return { success: true };
  } catch (error) {
    console.error("[deleteTemplate] Error:", error);
    return { success: false, error: "テンプレートの削除に失敗しました" };
  }
}

export async function toggleTemplateActive(
  id: number,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    await db.update(templates).set({ isActive: isActive ? 1 : 0 }).where(eq(templates.id, id));
    await logAuditAction(admin.id, isActive ? "ACTIVATE" : "DEACTIVATE", "template", id);
    revalidatePath("/admin/templates");
    return { success: true };
  } catch (error) {
    console.error("[toggleTemplateActive] Error:", error);
    return { success: false, error: "ステータスの更新に失敗しました" };
  }
}

// ============================================================================
// 予約管理
// ============================================================================

export type ReservationWithUser = Reservation & {
  user?: { name: string | null; email: string | null } | null;
};

export async function getAdminReservations(options?: {
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
}): Promise<ReservationWithUser[]> {
  await requireAdmin();

  const results = await db
    .select({
      id: reservations.id,
      userId: reservations.userId,
      videoId: reservations.videoId,
      paymentId: reservations.paymentId,
      projectionDate: reservations.projectionDate,
      slotNumber: reservations.slotNumber,
      status: reservations.status,
      holdExpiresAt: reservations.holdExpiresAt,
      lockedAt: reservations.lockedAt,
      idempotencyKey: reservations.idempotencyKey,
      cancelledAt: reservations.cancelledAt,
      createdAt: reservations.createdAt,
      updatedAt: reservations.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .orderBy(desc(reservations.projectionDate), asc(reservations.slotNumber));

  // フィルタリング
  let filtered = results;

  if (options?.status && options.status.length > 0) {
    filtered = filtered.filter((r) => options.status!.includes(r.status));
  }

  if (options?.dateFrom) {
    filtered = filtered.filter((r) => r.projectionDate >= options.dateFrom!);
  }

  if (options?.dateTo) {
    filtered = filtered.filter((r) => r.projectionDate <= options.dateTo!);
  }

  return filtered.map((r) => ({
    id: r.id,
    userId: r.userId,
    videoId: r.videoId,
    paymentId: r.paymentId,
    projectionDate: r.projectionDate,
    slotNumber: r.slotNumber,
    status: r.status,
    holdExpiresAt: r.holdExpiresAt,
    lockedAt: r.lockedAt,
    idempotencyKey: r.idempotencyKey,
    cancelledAt: r.cancelledAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: r.userName || r.userEmail ? { name: r.userName, email: r.userEmail } : null,
  }));
}

export async function markReservationCompleted(
  reservationId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    const reservation = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1);

    if (!reservation[0]) {
      return { success: false, error: "予約が見つかりません" };
    }

    if (reservation[0].status !== RESERVATION_STATUS.CONFIRMED) {
      return { success: false, error: "確定済みの予約のみ完了マークできます" };
    }

    await db
      .update(reservations)
      .set({
        status: RESERVATION_STATUS.COMPLETED,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, reservationId));

    await logAuditAction(admin.id, "COMPLETE", "reservation", reservationId, {
      projectionDate: reservation[0].projectionDate,
      slotNumber: reservation[0].slotNumber,
    });

    revalidatePath("/admin/reservations");
    return { success: true };
  } catch (error) {
    console.error("[markReservationCompleted] Error:", error);
    return { success: false, error: "完了マークに失敗しました" };
  }
}

export async function adminCancelReservation(
  reservationId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    const reservation = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1);

    if (!reservation[0]) {
      return { success: false, error: "予約が見つかりません" };
    }

    const currentReservation = reservation[0];
    let refundAmount = 0;

    // 既にキャンセル済みまたは完了済みの場合はエラー
    if (
      currentReservation.status === RESERVATION_STATUS.CANCELLED ||
      currentReservation.status === RESERVATION_STATUS.COMPLETED ||
      currentReservation.status === RESERVATION_STATUS.EXPIRED
    ) {
      return { success: false, error: "この予約はキャンセルできません" };
    }

    // confirmed の場合は返金処理
    if (
      currentReservation.status === RESERVATION_STATUS.CONFIRMED &&
      currentReservation.paymentId
    ) {
      const payment = await db
        .select()
        .from(payments)
        .where(eq(payments.id, currentReservation.paymentId))
        .limit(1);

      if (payment[0] && payment[0].stripePaymentIntentId) {
        try {
          const refund = await getStripe().refunds.create({
            payment_intent: payment[0].stripePaymentIntentId,
          });

          refundAmount = payment[0].amount;

          await db
            .update(payments)
            .set({
              status: PAYMENT_STATUS.REFUNDED,
              refundId: refund.id,
              refundedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(payments.id, currentReservation.paymentId));
        } catch (stripeError) {
          console.error("[adminCancelReservation] Stripe error:", stripeError);
          return { success: false, error: "返金処理に失敗しました" };
        }
      }

      // 動画を無料に戻す
      await db
        .update(videos)
        .set({
          videoType: "free",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後
        })
        .where(eq(videos.id, currentReservation.videoId));
    }

    // 予約をキャンセル（idempotencyKeyをnullにして再予約を可能に）
    await db
      .update(reservations)
      .set({
        status: RESERVATION_STATUS.CANCELLED,
        idempotencyKey: null,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, reservationId));

    await logAuditAction(admin.id, "CANCEL", "reservation", reservationId, {
      projectionDate: currentReservation.projectionDate,
      slotNumber: currentReservation.slotNumber,
      previousStatus: currentReservation.status,
      refundAmount,
    });

    revalidatePath("/admin/reservations");
    return { success: true };
  } catch (error) {
    console.error("[adminCancelReservation] Error:", error);
    return { success: false, error: "キャンセルに失敗しました" };
  }
}

// ============================================================================
// スケジュール管理
// ============================================================================

export async function getSchedules(): Promise<ProjectionSchedule[]> {
  await requireAdmin();
  return db
    .select()
    .from(projectionSchedules)
    .orderBy(asc(projectionSchedules.date));
}

export async function createSchedule(
  date: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    // 既に存在するかチェック
    const existing = await db
      .select()
      .from(projectionSchedules)
      .where(eq(projectionSchedules.date, date))
      .limit(1);

    if (existing[0]) {
      return { success: false, error: "この日付は既に登録されています" };
    }

    const [newSchedule] = await db.insert(projectionSchedules).values({
      date,
      slotsConfig: { slots: [1, 2, 3, 4], maxPerSlot: 1 },
      isActive: true,
    }).returning();

    await logAuditAction(admin.id, "CREATE", "schedule", newSchedule.id, { date });

    revalidatePath("/admin/schedules");
    return { success: true };
  } catch (error) {
    console.error("[createSchedule] Error:", error);
    return { success: false, error: "スケジュールの作成に失敗しました" };
  }
}

export async function deleteSchedule(
  scheduleId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    const schedule = await db
      .select()
      .from(projectionSchedules)
      .where(eq(projectionSchedules.id, scheduleId))
      .limit(1);

    if (!schedule[0]) {
      return { success: false, error: "スケジュールが見つかりません" };
    }

    // この日に予約があるかチェック
    const hasReservations = await db
      .select({ count: sql<number>`count(*)` })
      .from(reservations)
      .where(
        and(
          eq(reservations.projectionDate, schedule[0].date),
          inArray(reservations.status, [
            RESERVATION_STATUS.HOLD,
            RESERVATION_STATUS.CONFIRMED,
          ])
        )
      );

    if (hasReservations[0]?.count && hasReservations[0].count > 0) {
      return { success: false, error: "有効な予約があるため削除できません" };
    }

    await db.delete(projectionSchedules).where(eq(projectionSchedules.id, scheduleId));
    await logAuditAction(admin.id, "DELETE", "schedule", scheduleId, { date: schedule[0].date });

    revalidatePath("/admin/schedules");
    return { success: true };
  } catch (error) {
    console.error("[deleteSchedule] Error:", error);
    return { success: false, error: "スケジュールの削除に失敗しました" };
  }
}

export async function toggleScheduleActive(
  scheduleId: number,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    await db
      .update(projectionSchedules)
      .set({ isActive })
      .where(eq(projectionSchedules.id, scheduleId));
    await logAuditAction(admin.id, isActive ? "ACTIVATE" : "DEACTIVATE", "schedule", scheduleId);
    revalidatePath("/admin/schedules");
    return { success: true };
  } catch (error) {
    console.error("[toggleScheduleActive] Error:", error);
    return { success: false, error: "ステータスの更新に失敗しました" };
  }
}

// ============================================================================
// 監査ログ
// ============================================================================

export type AuditLogWithAdmin = AdminAuditLog & {
  adminName?: string | null;
};

export async function getAuditLogs(options?: {
  entity?: string;
  limit?: number;
}): Promise<AuditLogWithAdmin[]> {
  await requireAdmin();

  const results = await db
    .select({
      id: adminAuditLogs.id,
      adminUserId: adminAuditLogs.adminUserId,
      action: adminAuditLogs.action,
      entity: adminAuditLogs.entity,
      entityId: adminAuditLogs.entityId,
      details: adminAuditLogs.details,
      ipAddress: adminAuditLogs.ipAddress,
      createdAt: adminAuditLogs.createdAt,
      adminName: users.name,
    })
    .from(adminAuditLogs)
    .leftJoin(users, eq(adminAuditLogs.adminUserId, users.id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(options?.limit || 100);

  // エンティティフィルター
  if (options?.entity && options.entity !== "all") {
    return results.filter((r) => r.entity === options.entity);
  }

  return results;
}
