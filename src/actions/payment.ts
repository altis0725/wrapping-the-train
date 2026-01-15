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

  // 有効期限チェック（holdExpiresAtがNULLまたは期限切れは無効）
  if (!currentReservation.holdExpiresAt) {
    return { success: false, error: "予約の有効期限が設定されていません" };
  }
  if (currentReservation.holdExpiresAt < new Date()) {
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
  const reservationId = parseInt(metadata.reservationId, 10);
  const videoId = parseInt(metadata.videoId, 10);
  const userId = parseInt(metadata.userId, 10);

  // NaNチェック（入力健全性）
  if (isNaN(reservationId) || isNaN(videoId) || isNaN(userId)) {
    console.error(
      `[handlePaymentSuccess] Invalid metadata: reservationId=${metadata.reservationId}, videoId=${metadata.videoId}, userId=${metadata.userId}`
    );
    return { success: false, error: "Invalid metadata" };
  }

  try {
    // トランザクションで処理
    const result = await db.transaction(async (tx) => {
      // イベント記録（冪等性保証）- 競合時は既に処理済みなのでスキップ
      const insertResult = await tx
        .insert(stripeEvents)
        .values({
          eventId,
          eventType: "checkout.session.completed",
        })
        .onConflictDoNothing({ target: stripeEvents.eventId })
        .returning({ id: stripeEvents.id });

      // 挿入されなかった = 既に処理済み
      if (insertResult.length === 0) {
        console.log(`[handlePaymentSuccess] Event ${eventId} already processed (in transaction)`);
        return { skipped: true, reason: "already_processed" };
      }

      // 予約の現在状態を確認（競合対策）
      const currentReservation = await tx
        .select()
        .from(reservations)
        .where(eq(reservations.id, reservationId))
        .limit(1);

      if (!currentReservation[0]) {
        throw new Error("RESERVATION_NOT_FOUND");
      }

      const reservation = currentReservation[0];

      // metadataとDBの整合性チェック（SSOT: DBの値を信頼）
      if (reservation.userId !== userId || reservation.videoId !== videoId) {
        console.warn(
          `[handlePaymentSuccess] Metadata mismatch: DB(userId=${reservation.userId}, videoId=${reservation.videoId}) vs metadata(userId=${userId}, videoId=${videoId})`
        );
        // DBの値をSSOTとして使用
      }

      // HOLDステータスでない場合は補償ログを記録してスキップ
      if (reservation.status !== RESERVATION_STATUS.HOLD) {
        console.warn(
          `[handlePaymentSuccess] Reservation ${reservationId} is not in HOLD status (current: ${reservation.status}), logging compensation`
        );
        // 補償ログを記録（要返金対応）
        await tx.insert(compensationLogs).values({
          type: "REFUND",
          trigger: "PAYMENT_AFTER_STATUS_CHANGE",
          reservationId,
          videoId: reservation.videoId,
          amount: PROJECTION_PRICE,
          resolvedBy: "SYSTEM",
          notes: `予約ステータスが${reservation.status}のため決済完了を処理できませんでした。paymentIntentId: ${paymentIntentId}`,
        });
        return { skipped: true, reason: "status_not_hold" };
      }

      // HOLD期限切れまたはholdExpiresAtがNULLの場合は補償ログを記録してスキップ
      const now = new Date();
      if (!reservation.holdExpiresAt || reservation.holdExpiresAt < now) {
        const reason = !reservation.holdExpiresAt ? "holdExpiresAt is NULL" : "HOLD expired";
        console.warn(
          `[handlePaymentSuccess] Reservation ${reservationId} HOLD is invalid (${reason}), logging compensation`
        );
        // 補償ログを記録（要返金対応）
        await tx.insert(compensationLogs).values({
          type: "REFUND",
          trigger: "PAYMENT_AFTER_HOLD_EXPIRED",
          reservationId,
          videoId: reservation.videoId,
          amount: PROJECTION_PRICE,
          resolvedBy: "SYSTEM",
          notes: `${reason}のため決済完了を処理できませんでした。paymentIntentId: ${paymentIntentId}`,
        });
        return { skipped: true, reason: "hold_expired" };
      }

      // 先にreservationをアトミックに更新（WHERE status = HOLDで競合防止）
      // これにより、同時に複数のWebhookが来ても1つだけが成功する
      const reservationUpdateResult = await tx
        .update(reservations)
        .set({
          status: RESERVATION_STATUS.CONFIRMED,
          idempotencyKey: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(reservations.id, reservationId),
            eq(reservations.status, RESERVATION_STATUS.HOLD)
          )
        )
        .returning({ id: reservations.id });

      // 更新されなかった = 既に別のWebhookで処理済み
      if (reservationUpdateResult.length === 0) {
        console.log(
          `[handlePaymentSuccess] Reservation ${reservationId} already processed by another request`
        );
        return { skipped: true, reason: "already_confirmed" };
      }

      // payment作成（DBのuserIdをSSOTとして使用）
      const [payment] = await tx
        .insert(payments)
        .values({
          userId: reservation.userId,
          amount: PROJECTION_PRICE,
          stripePaymentIntentId: paymentIntentId,
          status: PAYMENT_STATUS.SUCCEEDED,
        })
        .returning();

      // paymentIdをreservationに紐付け
      await tx
        .update(reservations)
        .set({
          paymentId: payment.id,
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, reservationId));

      // video更新（有料化 + 有効期限延長、DBのvideoIdをSSOTとして使用）
      const projectionDate = new Date(reservation.projectionDate);
      const newExpiresAt = addYears(projectionDate, 1);

      await tx
        .update(videos)
        .set({
          videoType: "paid",
          expiresAt: newExpiresAt,
        })
        .where(eq(videos.id, reservation.videoId));

      return { skipped: false };
    });

    if (result.skipped) {
      // 補償ログが必要なケースとそうでないケースを区別
      const needsCompensation = result.reason !== "already_processed" && result.reason !== "already_confirmed";
      if (needsCompensation) {
        console.log(
          `[handlePaymentSuccess] Reservation ${reservationId} skipped (reason: ${result.reason}), compensation logged`
        );
      } else {
        console.log(
          `[handlePaymentSuccess] Reservation ${reservationId} skipped (reason: ${result.reason}), no action needed`
        );
      }
    } else {
      console.log(
        `[handlePaymentSuccess] Successfully processed reservation ${reservationId}`
      );
    }
    return { success: true };
  } catch (error) {
    console.error("[handlePaymentSuccess] Error:", error);

    // 補償ログに記録（調査が必要なケース - 再実行で解決する可能性あり）
    // MANUAL: 人手調査が必要。即座にREFUNDではなく、原因調査後に判断する
    try {
      await db.insert(compensationLogs).values({
        type: "MANUAL",
        trigger: "PAYMENT_DB_FAILURE",
        reservationId,
        videoId,
        amount: PROJECTION_PRICE,
        resolvedBy: "SYSTEM",
        notes: `DB処理失敗。要調査: ${error instanceof Error ? error.message : "Unknown error"}. eventId: ${eventId}, paymentIntentId: ${paymentIntentId}`,
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
