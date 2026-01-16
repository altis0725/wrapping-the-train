import { z } from "zod";

// ============================================================================
// 新仕様: 60秒動画（背景6個 + 窓1個 + 車輪1個）
// ============================================================================

/**
 * 動画作成リクエストのバリデーションスキーマ（60秒動画）
 * 背景6個 + 窓1個 + 車輪1個 = 8テンプレートIDを受け取る
 */
export const createVideoSchema = z.object({
  backgrounds: z
    .array(
      z.number().int().positive("背景テンプレートIDは正の整数である必要があります")
    )
    .length(6, "6つの背景を選択してください"),
  windowTemplateId: z
    .number()
    .int()
    .positive("窓テンプレートIDは正の整数である必要があります"),
  wheelTemplateId: z
    .number()
    .int()
    .positive("車輪テンプレートIDは正の整数である必要があります"),
  musicTemplateId: z
    .number()
    .int()
    .positive("音楽テンプレートIDは正の整数である必要があります"),
});

export type CreateVideoInput = z.infer<typeof createVideoSchema>;

// ============================================================================
// 旧仕様: 30秒動画（後方互換性のため残す）
// ============================================================================

/**
 * セグメント単位のテンプレート選択スキーマ（旧仕様）
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
 * 動画作成リクエストのバリデーションスキーマ（30秒動画・旧仕様）
 * @deprecated 新しいcreateVideoSchemaを使用してください
 */
export const createVideoSchemaLegacy = z.object({
  segments: z.array(segmentSchema).length(3, "3セグメント分の選択が必要です"),
});

export type CreateVideoInputLegacy = z.infer<typeof createVideoSchemaLegacy>;

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
