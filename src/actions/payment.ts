"use server";

import { db } from "@/db";
import {
  reservations,
  payments,
  videos,
  stripeEvents,
  compensationLogs,
  RESERVATION_STATUS,
  PAYMENT_STATUS,
  type Payment,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe";
import { PROJECTION_PRICE } from "@/lib/constants/slot";
import { reservationIdSchema } from "@/lib/validations/reservation";
import { addYears } from "date-fns";

export type CreateCheckoutResult =
  | { success: true; checkoutUrl: string }
  | { success: false; error: string };

export type RefundResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Stripe Checkout Sessionを作成
 */
export async function createCheckoutSession(
  reservationId: number
): Promise<CreateCheckoutResult> {
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

  // hold状態のみ決済可能
  if (currentReservation.status !== RESERVATION_STATUS.HOLD) {
    return { success: false, error: "この予約は決済できません" };
  }

  // 有効期限チェック
  if (
    currentReservation.holdExpiresAt &&
    currentReservation.holdExpiresAt < new Date()
  ) {
    return { success: false, error: "仮押さえの期限が切れています" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: "プロジェクションマッピング投影予約",
              description: `${currentReservation.projectionDate} スロット${currentReservation.slotNumber}`,
            },
            unit_amount: PROJECTION_PRICE,
          },
          quantity: 1,
        },
      ],
      metadata: {
        reservationId: String(reservationId),
        videoId: String(currentReservation.videoId),
        userId: String(user.id),
      },
      success_url: `${baseUrl}/mypage?payment=success&reservationId=${reservationId}`,
      cancel_url: `${baseUrl}/reservations?payment=cancelled&reservationId=${reservationId}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30分後に期限切れ（Stripeの最低要件）
    });

    // locked_at を更新
    await db
      .update(reservations)
      .set({
        lockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, reservationId));

    return { success: true, checkoutUrl: session.url || "" };
  } catch (error) {
    console.error("[createCheckoutSession] Error:", error);
    return { success: false, error: "決済セッションの作成に失敗しました" };
  }
}

/**
 * 決済完了処理（Webhookから呼び出し）
 */
export async function handlePaymentSuccess(
  eventId: string,
  sessionId: string,
  metadata: {
    reservationId: string;
    videoId: string;
    userId: string;
  },
  paymentIntentId: string
): Promise<{ success: boolean; error?: string }> {
  // 冪等性チェック
  const existingEvent = await db
    .select()
    .from(stripeEvents)
    .where(eq(stripeEvents.eventId, eventId))
    .limit(1);

  if (existingEvent[0]) {
    console.log(`[handlePaymentSuccess] Event ${eventId} already processed`);
    return { success: true };
  }

  const reservationId = parseInt(metadata.reservationId, 10);
  const videoId = parseInt(metadata.videoId, 10);
  const userId = parseInt(metadata.userId, 10);

  try {
    // トランザクションで処理
    await db.transaction(async (tx) => {
      // イベント記録（冪等性保証）
      await tx.insert(stripeEvents).values({
        eventId,
        eventType: "checkout.session.completed",
      });

      // payment作成
      const [payment] = await tx
        .insert(payments)
        .values({
          userId,
          amount: PROJECTION_PRICE,
          stripePaymentIntentId: paymentIntentId,
          status: PAYMENT_STATUS.SUCCEEDED,
        })
        .returning();

      // reservation更新
      await tx
        .update(reservations)
        .set({
          status: RESERVATION_STATUS.CONFIRMED,
          paymentId: payment.id,
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, reservationId));

      // video更新（有料化 + 有効期限延長）
      const reservation = await tx
        .select()
        .from(reservations)
        .where(eq(reservations.id, reservationId))
        .limit(1);

      if (reservation[0]) {
        const projectionDate = new Date(reservation[0].projectionDate);
        const newExpiresAt = addYears(projectionDate, 1);

        await tx
          .update(videos)
          .set({
            videoType: "paid",
            expiresAt: newExpiresAt,
          })
          .where(eq(videos.id, videoId));
      }
    });

    console.log(
      `[handlePaymentSuccess] Successfully processed reservation ${reservationId}`
    );
    return { success: true };
  } catch (error) {
    console.error("[handlePaymentSuccess] Error:", error);

    // 補償ログに記録
    try {
      await db.insert(compensationLogs).values({
        type: "REFUND",
        trigger: "PAYMENT_DB_FAILURE",
        reservationId,
        videoId,
        amount: PROJECTION_PRICE,
        resolvedBy: "SYSTEM",
        notes: error instanceof Error ? error.message : "Unknown error",
      });
    } catch {
      // ログ記録の失敗は無視
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 返金処理
 */
export async function refundPayment(paymentId: number): Promise<RefundResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  // 支払い情報を取得
  const payment = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.userId, user.id)))
    .limit(1);

  if (!payment[0]) {
    return { success: false, error: "支払い情報が見つかりません" };
  }

  const currentPayment = payment[0];

  // succeeded状態のみ返金可能
  if (currentPayment.status !== PAYMENT_STATUS.SUCCEEDED) {
    return { success: false, error: "この支払いは返金できません" };
  }

  if (!currentPayment.stripePaymentIntentId) {
    return { success: false, error: "支払いIDがありません" };
  }

  try {
    const refund = await getStripe().refunds.create({
      payment_intent: currentPayment.stripePaymentIntentId,
    });

    await db
      .update(payments)
      .set({
        status: PAYMENT_STATUS.REFUNDED,
        refundId: refund.id,
        refundedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    return { success: true };
  } catch (error) {
    console.error("[refundPayment] Error:", error);
    return { success: false, error: "返金処理に失敗しました" };
  }
}

/**
 * ユーザーの支払い履歴を取得
 */
export async function getUserPayments(): Promise<Payment[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, user.id))
    .orderBy(payments.createdAt);

  return result;
}
