import { z } from "zod";

/**
 * セグメント単位のテンプレート選択スキーマ
 */
export const segmentSchema = z.object({
  template1Id: z
    .number()
    .int()
    .positive("背景テンプレートIDは正の整数である必要があります"),
  template2Id: z
    .number()
    .int()
    .positive("窓テンプレートIDは正の整数である必要があります"),
  template3Id: z
    .number()
    .int()
    .positive("車輪テンプレートIDは正の整数である必要があります"),
});

export type SegmentInput = z.infer<typeof segmentSchema>;

/**
 * 動画作成リクエストのバリデーションスキーマ（30秒動画対応）
 * 3セグメント分のテンプレートIDを受け取る
 */
export const createVideoSchema = z.object({
  segments: z.array(segmentSchema).length(3, "3セグメント分の選択が必要です"),
});

export type CreateVideoInput = z.infer<typeof createVideoSchema>;

/**
 * 動画ID取得のバリデーションスキーマ
 */
export const videoIdSchema = z.object({
  videoId: z.number().int().positive("動画IDは正の整数である必要があります"),
});

export type VideoIdInput = z.infer<typeof videoIdSchema>;

/**
 * 動画リトライリクエストのバリデーションスキーマ
 */
export const retryVideoSchema = z.object({
  videoId: z.number().int().positive("動画IDは正の整数である必要があります"),
});

export type RetryVideoInput = z.infer<typeof retryVideoSchema>;
