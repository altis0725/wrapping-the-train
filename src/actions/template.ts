"use server";

import { db } from "@/db";
import { templates, TEMPLATE_CATEGORY, type Template } from "@/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { getThumbnailUrl } from "@/lib/storage/resolver";
import { isValidExternalUrl } from "@/lib/validations/url";

export type TemplateWithCategory = Template & {
  categoryName: string;
};

// サムネイルURLが解決されたテンプレート型
export type TemplateWithResolvedThumbnail = Template & {
  resolvedThumbnailUrl?: string;
};

/**
 * サムネイルURLがストレージキー形式かどうかを判定
 * storageKey形式: "thumbnails/..." または "/thumbnails/..."
 */
function isStorageKeyFormat(url: string): boolean {
  // 先頭のスラッシュを除いて判定（DBに誤って /thumbnails/... と保存されるケースを考慮）
  const normalized = url.replace(/^\/+/, "");
  return normalized.startsWith("thumbnails/");
}

/**
 * ストレージキーを正規化（先頭スラッシュを除去）
 */
function normalizeStorageKey(url: string): string {
  return url.replace(/^\/+/, "");
}

/**
 * 許可された相対パス（内部アセット）かどうかを判定
 * セキュリティ: 許可するパスプレフィックスをホワイトリストで限定
 */
function isAllowedRelativePath(url: string): boolean {
  const allowedPrefixes = ["/img/", "/video/", "/assets/", "/thumbnails/"];
  const trimmed = url.trim();
  return allowedPrefixes.some((prefix) => trimmed.startsWith(prefix));
}

/**
 * テンプレートのサムネイルURLを解決
 * storageKey形式の場合はPresigned URLを生成
 * 相対パスの場合はそのまま使用（内部アセット）
 * 外部URLの場合はhttps かつ安全なホストのみ許可
 */
async function resolveTemplateThumbnail(
  template: Template
): Promise<TemplateWithResolvedThumbnail> {
  let resolvedThumbnailUrl: string | undefined;
  const thumbnailUrl = template.thumbnailUrl;

  if (!thumbnailUrl) {
    return { ...template, resolvedThumbnailUrl };
  }

  if (isStorageKeyFormat(thumbnailUrl)) {
    // storageKey形式の場合はPresigned URLを生成
    const storageKey = normalizeStorageKey(thumbnailUrl);
    try {
      resolvedThumbnailUrl = await getThumbnailUrl(storageKey);
    } catch (error) {
      // エラー時はログを出力（storageKey形式なのでフォールバック先がない）
      console.warn(
        `[resolveTemplateThumbnail] Failed to resolve thumbnail for template ${template.id}:`,
        storageKey,
        error instanceof Error ? error.message : error
      );
    }
  } else if (isAllowedRelativePath(thumbnailUrl)) {
    // 許可された相対パス（/img/... など）は内部アセットとしてそのまま使用
    resolvedThumbnailUrl = thumbnailUrl;
  } else if (isValidExternalUrl(thumbnailUrl)) {
    // 外部 URL の場合はhttpsスキームかつ内部ホストでないことを検証
    resolvedThumbnailUrl = thumbnailUrl;
  }
  // 不正なURLの場合は undefined のまま（XSS/SSRF対策）
  return { ...template, resolvedThumbnailUrl };
}


/**
 * カテゴリ別にテンプレートを取得
 */
export async function getTemplatesByCategory(
  category: 1 | 2 | 3
): Promise<Template[]> {
  const result = await db
    .select()
    .from(templates)
    .where(and(eq(templates.category, category), eq(templates.isActive, 1)))
    .orderBy(asc(templates.displayOrder));

  return result;
}

/**
 * 全カテゴリのテンプレートをまとめて取得
 */
export async function getAllTemplates(): Promise<{
  background: Template[];
  window: Template[];
  wheel: Template[];
}> {
  const [background, window, wheel] = await Promise.all([
    getTemplatesByCategory(TEMPLATE_CATEGORY.BACKGROUND as 1),
    getTemplatesByCategory(TEMPLATE_CATEGORY.WINDOW as 2),
    getTemplatesByCategory(TEMPLATE_CATEGORY.WHEEL as 3),
  ]);

  return { background, window, wheel };
}

/**
 * 全カテゴリのテンプレートをサムネイルURL解決済みで取得
 * ユーザー向けページで使用
 */
export async function getAllTemplatesWithThumbnails(): Promise<{
  background: TemplateWithResolvedThumbnail[];
  window: TemplateWithResolvedThumbnail[];
  wheel: TemplateWithResolvedThumbnail[];
}> {
  const [background, window, wheel] = await Promise.all([
    getTemplatesByCategory(TEMPLATE_CATEGORY.BACKGROUND as 1),
    getTemplatesByCategory(TEMPLATE_CATEGORY.WINDOW as 2),
    getTemplatesByCategory(TEMPLATE_CATEGORY.WHEEL as 3),
  ]);

  // 全テンプレートのサムネイルを並列で解決
  const [resolvedBackground, resolvedWindow, resolvedWheel] = await Promise.all([
    Promise.all(background.map(resolveTemplateThumbnail)),
    Promise.all(window.map(resolveTemplateThumbnail)),
    Promise.all(wheel.map(resolveTemplateThumbnail)),
  ]);

  return {
    background: resolvedBackground,
    window: resolvedWindow,
    wheel: resolvedWheel,
  };
}

/**
 * テンプレートIDからテンプレート情報を取得
 */
export async function getTemplateById(id: number): Promise<Template | null> {
  const result = await db
    .select()
    .from(templates)
    .where(eq(templates.id, id))
    .limit(1);

  return result[0] ?? null;
}

/**
 * 複数のテンプレートIDからテンプレート情報を取得
 */
export async function getTemplatesByIds(
  ids: number[]
): Promise<Map<number, Template>> {
  if (ids.length === 0) return new Map();

  // WHERE 句で必要なIDのみ取得（パフォーマンス改善）
  const result = await db
    .select()
    .from(templates)
    .where(inArray(templates.id, ids));

  return new Map(result.map((t) => [t.id, t]));
}

/**
 * テンプレートの存在確認と有効性チェック
 */
export async function validateTemplateSelection(
  template1Id: number,
  template2Id: number,
  template3Id: number
): Promise<{
  valid: boolean;
  error?: string;
  templates?: {
    background: Template;
    window: Template;
    wheel: Template;
  };
}> {
  const templateMap = await getTemplatesByIds([
    template1Id,
    template2Id,
    template3Id,
  ]);

  const t1 = templateMap.get(template1Id);
  const t2 = templateMap.get(template2Id);
  const t3 = templateMap.get(template3Id);

  if (!t1) {
    return { valid: false, error: "背景テンプレートが見つかりません" };
  }
  if (!t2) {
    return { valid: false, error: "窓テンプレートが見つかりません" };
  }
  if (!t3) {
    return { valid: false, error: "車輪テンプレートが見つかりません" };
  }

  if (t1.category !== TEMPLATE_CATEGORY.BACKGROUND) {
    return { valid: false, error: "背景テンプレートのカテゴリが不正です" };
  }
  if (t2.category !== TEMPLATE_CATEGORY.WINDOW) {
    return { valid: false, error: "窓テンプレートのカテゴリが不正です" };
  }
  if (t3.category !== TEMPLATE_CATEGORY.WHEEL) {
    return { valid: false, error: "車輪テンプレートのカテゴリが不正です" };
  }

  if (t1.isActive !== 1 || t2.isActive !== 1 || t3.isActive !== 1) {
    return { valid: false, error: "選択されたテンプレートは現在利用できません" };
  }

  return {
    valid: true,
    templates: {
      background: t1,
      window: t2,
      wheel: t3,
    },
  };
}

// セグメントの入力型
export type SegmentTemplateIds = {
  template1Id: number;
  template2Id: number;
  template3Id: number;
};

// バリデーション結果型
export type TemplateValidationResult = {
  valid: boolean;
  error?: string;
  templates?: {
    background: Template;
    window: Template;
    wheel: Template;
  };
};

/**
 * 複数セグメントのテンプレート検証を一括で実行
 * パフォーマンス最適化: 全IDを一度のクエリで取得
 */
export async function validateTemplateSelectionBatch(
  segments: SegmentTemplateIds[]
): Promise<TemplateValidationResult[]> {
  // 全セグメントから全IDを収集（重複除去）
  const allIds = [...new Set(
    segments.flatMap((seg) => [seg.template1Id, seg.template2Id, seg.template3Id])
  )];

  // 一括でテンプレートを取得（1クエリのみ）
  const templateMap = await getTemplatesByIds(allIds);

  // 各セグメントを検証
  return segments.map((seg) => {
    const t1 = templateMap.get(seg.template1Id);
    const t2 = templateMap.get(seg.template2Id);
    const t3 = templateMap.get(seg.template3Id);

    if (!t1) {
      return { valid: false, error: "背景テンプレートが見つかりません" };
    }
    if (!t2) {
      return { valid: false, error: "窓テンプレートが見つかりません" };
    }
    if (!t3) {
      return { valid: false, error: "車輪テンプレートが見つかりません" };
    }

    if (t1.category !== TEMPLATE_CATEGORY.BACKGROUND) {
      return { valid: false, error: "背景テンプレートのカテゴリが不正です" };
    }
    if (t2.category !== TEMPLATE_CATEGORY.WINDOW) {
      return { valid: false, error: "窓テンプレートのカテゴリが不正です" };
    }
    if (t3.category !== TEMPLATE_CATEGORY.WHEEL) {
      return { valid: false, error: "車輪テンプレートのカテゴリが不正です" };
    }

    if (t1.isActive !== 1 || t2.isActive !== 1 || t3.isActive !== 1) {
      return { valid: false, error: "選択されたテンプレートは現在利用できません" };
    }

    return {
      valid: true,
      templates: {
        background: t1,
        window: t2,
        wheel: t3,
      },
    };
  });
}
