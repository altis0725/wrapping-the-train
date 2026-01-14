import { z } from "zod";

/**
 * スロット番号のバリデーション (1-4)
 */
export const slotNumberSchema = z
  .number()
  .int()
  .min(1, "スロット番号は1以上です")
  .max(4, "スロット番号は4以下です");

/**
 * 仮押さえリクエストのバリデーションスキーマ
 */
export const holdSlotSchema = z.object({
  videoId: z
    .number()
    .int()
    .positive("動画IDは正の整数である必要があります"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で指定してください"),
  slotNumber: slotNumberSchema,
});

export type HoldSlotInput = z.infer<typeof holdSlotSchema>;

/**
 * 予約IDのバリデーションスキーマ
 */
export const reservationIdSchema = z.object({
  reservationId: z
    .number()
    .int()
    .positive("予約IDは正の整数である必要があります"),
});

export type ReservationIdInput = z.infer<typeof reservationIdSchema>;

/**
 * スロット取得リクエストのバリデーションスキーマ
 */
export const getAvailableSlotsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で指定してください"),
});

export type GetAvailableSlotsInput = z.infer<typeof getAvailableSlotsSchema>;

/**
 * キャンセルリクエストのバリデーションスキーマ
 */
export const cancelReservationSchema = z.object({
  reservationId: z
    .number()
    .int()
    .positive("予約IDは正の整数である必要があります"),
});

export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
