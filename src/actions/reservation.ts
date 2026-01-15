"use server";

import { db } from "@/db";
import {
  reservations,
  videos,
  projectionSchedules,
  RESERVATION_STATUS,
  type Reservation,
} from "@/db/schema";
import { eq, and, sql, inArray, lt, or, isNull, gt } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import {
  holdSlotSchema,
  reservationIdSchema,
  type HoldSlotInput,
} from "@/lib/validations/reservation";
import { HOLD_EXPIRY_MINUTES, CANCEL_DEADLINE_HOURS, getSlotStartTime, MAX_RESERVATIONS_PER_SLOT } from "@/lib/constants/slot";
import { subHours, isBefore, parseISO, set } from "date-fns";
import { v4 as uuidv4 } from "uuid";

export type SlotStatus = "available" | "partial" | "full";

export interface SlotInfo {
  slotNumber: number;
  status: SlotStatus;
  isOwn: boolean; // 自分の仮押さえがあるかどうか
  holdExpiresAt?: Date;
  reservationCount: number; // 現在の予約数
  maxReservations: number; // 最大予約数
}

export type HoldSlotResult =
  | { success: true; reservation: Reservation }
  | { success: false; error: string };

export type ReleaseSlotResult =
  | { success: true }
  | { success: false; error: string };

export type CancelReservationResult =
  | { success: true }
  | { success: false; error: string };

/**
 * 指定日のスロット状態を取得
 */
export async function getAvailableSlots(date: string): Promise<{
  available: boolean;
  slots: SlotInfo[];
}> {
  const user = await getCurrentUser();

  // 投影スケジュールの確認
  const schedule = await db
    .select()
    .from(projectionSchedules)
    .where(
      and(
        eq(projectionSchedules.date, date),
        eq(projectionSchedules.isActive, true)
      )
    )
    .limit(1);

  if (!schedule[0]) {
    return { available: false, slots: [] };
  }

  const now = new Date();

  // 該当日の有効な予約を取得（期限切れHOLDを除外）
  const activeReservations = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.projectionDate, date),
        or(
          // CONFIRMED, COMPLETED は常に有効
          inArray(reservations.status, [
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.COMPLETED,
          ]),
          // HOLD は期限内のみ有効
          and(
            eq(reservations.status, RESERVATION_STATUS.HOLD),
            or(
              isNull(reservations.holdExpiresAt),
              gt(reservations.holdExpiresAt, now)
            )
          )
        )
      )
    );

  // スロットごとの予約数をカウント
  const slotReservationCounts: Record<number, number> = {};
  const ownReservationSlots: Set<number> = new Set();
  const ownHoldExpiresAt: Record<number, Date | undefined> = {};

  for (const reservation of activeReservations) {
    slotReservationCounts[reservation.slotNumber] =
      (slotReservationCounts[reservation.slotNumber] || 0) + 1;

    if (user && reservation.userId === user.id) {
      ownReservationSlots.add(reservation.slotNumber);
      if (reservation.status === RESERVATION_STATUS.HOLD && reservation.holdExpiresAt) {
        ownHoldExpiresAt[reservation.slotNumber] = reservation.holdExpiresAt;
      }
    }
  }

  // スロット1-4の状態を構築
  const slots: SlotInfo[] = [1, 2, 3, 4].map((slotNumber) => {
    const count = slotReservationCounts[slotNumber] || 0;
    const isOwn = ownReservationSlots.has(slotNumber);
    const holdExpiresAt = ownHoldExpiresAt[slotNumber];

    let status: SlotStatus;
    if (count === 0) {
      status = "available";
    } else if (count < MAX_RESERVATIONS_PER_SLOT) {
      status = "partial";
    } else {
      status = "full";
    }

    return {
      slotNumber,
      status,
      isOwn,
      holdExpiresAt,
      reservationCount: count,
      maxReservations: MAX_RESERVATIONS_PER_SLOT,
    };
  });

  return { available: true, slots };
}

/**
 * スロットを仮押さえ
 */
export async function holdSlot(input: HoldSlotInput): Promise<HoldSlotResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  // バリデーション
  const parsed = holdSlotSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "入力が不正です",
    };
  }

  const { videoId, date, slotNumber } = parsed.data;

  // 動画の所有者チェック
  const video = await db
    .select()
    .from(videos)
    .where(and(eq(videos.id, videoId), eq(videos.userId, user.id)))
    .limit(1);

  if (!video[0]) {
    return { success: false, error: "動画が見つかりません" };
  }

  // 投影スケジュールの確認
  const schedule = await db
    .select()
    .from(projectionSchedules)
    .where(
      and(
        eq(projectionSchedules.date, date),
        eq(projectionSchedules.isActive, true)
      )
    )
    .limit(1);

  if (!schedule[0]) {
    return { success: false, error: "この日は投影スケジュールがありません" };
  }

  // 仮押さえの有効期限
  const holdExpiresAt = new Date();
  holdExpiresAt.setMinutes(holdExpiresAt.getMinutes() + HOLD_EXPIRY_MINUTES);

  // 冪等性キー
  const idempotencyKey = uuidv4();

  try {
    // トランザクションで原子的に処理
    const result = await db.transaction(async (tx) => {
      // Advisory Lock を取得（date + slotNumber の組み合わせでロック）
      // 注: hashtext は 32-bit のため理論上衝突の可能性はあるが、
      // 日付+スロットの組み合わせでは実用上問題ない
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${date}), ${slotNumber})`);

      const now = new Date();

      // 現在のスロット予約数をチェック（期限切れHOLDを除外）
      const existingReservations = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(reservations)
        .where(
          and(
            eq(reservations.projectionDate, date),
            eq(reservations.slotNumber, slotNumber),
            or(
              // CONFIRMED, COMPLETED は常に有効
              inArray(reservations.status, [
                RESERVATION_STATUS.CONFIRMED,
                RESERVATION_STATUS.COMPLETED,
              ]),
              // HOLD は期限内のみ有効
              and(
                eq(reservations.status, RESERVATION_STATUS.HOLD),
                or(
                  isNull(reservations.holdExpiresAt),
                  gt(reservations.holdExpiresAt, now)
                )
              )
            )
          )
        );

      const currentCount = existingReservations[0]?.count || 0;
      if (currentCount >= MAX_RESERVATIONS_PER_SLOT) {
        throw new Error("SLOT_FULL");
      }

      // 仮押さえ作成
      const [reservation] = await tx
        .insert(reservations)
        .values({
          userId: user.id,
          videoId,
          projectionDate: date,
          slotNumber,
          status: RESERVATION_STATUS.HOLD,
          holdExpiresAt,
          idempotencyKey,
        })
        .returning();

      return reservation;
    });

    return { success: true, reservation: result };
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_FULL") {
      return { success: false, error: "このスロットは満席です" };
    }
    console.error("[holdSlot] Error:", error);
    return { success: false, error: "仮押さえに失敗しました" };
  }
}

/**
 * 仮押さえを解放
 */
export async function releaseSlot(
  reservationId: number
): Promise<ReleaseSlotResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  const parsed = reservationIdSchema.safeParse({ reservationId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "入力が不正です",
    };
  }

  // 予約を取得（所有者チェック）
  const reservation = await db
    .select()
    .from(reservations)
    .where(
      and(eq(reservations.id, reservationId), eq(reservations.userId, user.id))
    )
    .limit(1);

  if (!reservation[0]) {
    return { success: false, error: "予約が見つかりません" };
  }

  // hold状態のみ解放可能
  if (reservation[0].status !== RESERVATION_STATUS.HOLD) {
    return { success: false, error: "この予約は解放できません" };
  }

  // expired に更新
  await db
    .update(reservations)
    .set({
      status: RESERVATION_STATUS.EXPIRED,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, reservationId));

  return { success: true };
}

/**
 * 予約をキャンセル（確定済みの場合は返金が必要）
 */
export async function cancelReservation(
  reservationId: number
): Promise<CancelReservationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  const parsed = reservationIdSchema.safeParse({ reservationId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "入力が不正です",
    };
  }

  // 予約を取得（所有者チェック）
  const reservation = await db
    .select()
    .from(reservations)
    .where(
      and(eq(reservations.id, reservationId), eq(reservations.userId, user.id))
    )
    .limit(1);

  if (!reservation[0]) {
    return { success: false, error: "予約が見つかりません" };
  }

  const currentReservation = reservation[0];

  // キャンセル可能な状態かチェック
  if (
    currentReservation.status !== RESERVATION_STATUS.HOLD &&
    currentReservation.status !== RESERVATION_STATUS.CONFIRMED
  ) {
    return { success: false, error: "この予約はキャンセルできません" };
  }

  // confirmed の場合はキャンセル期限をチェック
  if (currentReservation.status === RESERVATION_STATUS.CONFIRMED) {
    const projectionDate = parseISO(currentReservation.projectionDate);
    const slotTime = getSlotStartTime(currentReservation.slotNumber);
    const [hours, minutes] = slotTime.split(":").map(Number);
    const projectionStart = set(projectionDate, {
      hours,
      minutes,
      seconds: 0,
      milliseconds: 0,
    });

    const deadline = subHours(projectionStart, CANCEL_DEADLINE_HOURS);

    if (!isBefore(new Date(), deadline)) {
      return {
        success: false,
        error: `投影開始${CANCEL_DEADLINE_HOURS}時間前を過ぎているためキャンセルできません`,
      };
    }

    // 返金処理が必要（payment.tsで実装）
    // ここではステータス更新のみ
  }

  // キャンセル状態に更新
  await db
    .update(reservations)
    .set({
      status: RESERVATION_STATUS.CANCELLED,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, reservationId));

  return { success: true };
}

/**
 * ユーザーの予約一覧を取得
 */
export async function getUserReservations(): Promise<Reservation[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const result = await db
    .select()
    .from(reservations)
    .where(eq(reservations.userId, user.id))
    .orderBy(sql`${reservations.projectionDate} DESC`);

  return result;
}

/**
 * 予約の詳細を取得（所有者チェック付き）
 */
export async function getReservationById(
  reservationId: number
): Promise<Reservation | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const result = await db
    .select()
    .from(reservations)
    .where(
      and(eq(reservations.id, reservationId), eq(reservations.userId, user.id))
    )
    .limit(1);

  return result[0] || null;
}

/**
 * 期限切れの仮押さえを解放（Cron用）
 */
export async function releaseExpiredHolds(): Promise<number> {
  const now = new Date();

  const result = await db
    .update(reservations)
    .set({
      status: RESERVATION_STATUS.EXPIRED,
      updatedAt: now,
    })
    .where(
      and(
        eq(reservations.status, RESERVATION_STATUS.HOLD),
        lt(reservations.holdExpiresAt, now)
      )
    )
    .returning();

  return result.length;
}
