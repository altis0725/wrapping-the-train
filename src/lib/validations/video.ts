import { z } from "zod";

/**
 * 動画作成リクエストのバリデーションスキーマ
 */
export const createVideoSchema = z.object({
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
