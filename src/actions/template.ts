"use server";

import { db } from "@/db";
import { templates, TEMPLATE_CATEGORY, type Template } from "@/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { getThumbnailUrl, getMusicUrl } from "@/lib/storage/resolver";
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
 * セキュリティ:
 * - 許可するパスプレフィックスをホワイトリストで限定
 * - パストラバーサル攻撃を防止（..を含むパスを拒否）
 * - 許可する拡張子をホワイトリストで限定
 */
function isAllowedRelativePath(url: string): boolean {
  const allowedPrefixes = ["/img/", "/video/", "/assets/", "/thumbnails/"];
  const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp4", ".webm", ".mov"];
  const trimmed = url.trim().toLowerCase();

  // パストラバーサル攻撃を防止
  if (trimmed.includes("..") || trimmed.includes("%2e%2e")) {
    return false;
  }

  // プレフィックスチェック
  const hasAllowedPrefix = allowedPrefixes.some((prefix) => trimmed.startsWith(prefix));
  if (!hasAllowedPrefix) {
    return false;
  }

  // 拡張子チェック（クエリパラメータを除去してから判定）
  const pathWithoutQuery = trimmed.split("?")[0];
  const hasAllowedExtension = allowedExtensions.some((ext) => pathWithoutQuery.endsWith(ext));

  return hasAllowedExtension;
}

/**
 * テンプレートのサムネイルURLを解決
 * storageKey形式の場合はPresigned URLを生成
 * 相対パスの場合はそのまま使用（内部アセット）
 * 外部URLの場合はhttps かつ安全なホストのみ許可
 *
 * 音楽カテゴリの場合は resolvedThumbnailUrl に音楽ファイルの URL を格納
 * （プレビュー再生用）
 */
async function resolveTemplateThumbnail(
  template: Template
): Promise<TemplateWithResolvedThumbnail> {
  let resolvedThumbnailUrl: string | undefined;

  // 音楽カテゴリの場合は videoUrl を解決（プレビュー再生用）
  if (template.category === TEMPLATE_CATEGORY.MUSIC) {
    try {
      resolvedThumbnailUrl = await getMusicUrl(template);
    } catch (error) {
      console.warn(
        `[resolveTemplateThumbnail] Failed to resolve music URL for template ${template.id}:`,
        error instanceof Error ? error.message : error
      );
    }
    return { ...template, resolvedThumbnailUrl };
  }

  // 通常のカテゴリはサムネイル画像を解決
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
  category: 1 | 2 | 3 | 4
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
  music: Template[];
}> {
  const [background, window, wheel, music] = await Promise.all([
    getTemplatesByCategory(TEMPLATE_CATEGORY.BACKGROUND as 1),
    getTemplatesByCategory(TEMPLATE_CATEGORY.WINDOW as 2),
    getTemplatesByCategory(TEMPLATE_CATEGORY.WHEEL as 3),
    getTemplatesByCategory(TEMPLATE_CATEGORY.MUSIC as 4),
  ]);

  return { background, window, wheel, music };
}

/**
 * 全カテゴリのテンプレートをサムネイルURL解決済みで取得
 * ユーザー向けページで使用
 */
export async function getAllTemplatesWithThumbnails(): Promise<{
  background: TemplateWithResolvedThumbnail[];
  window: TemplateWithResolvedThumbnail[];
  wheel: TemplateWithResolvedThumbnail[];
  music: TemplateWithResolvedThumbnail[];
}> {
  const [background, window, wheel, music] = await Promise.all([
    getTemplatesByCategory(TEMPLATE_CATEGORY.BACKGROUND as 1),
    getTemplatesByCategory(TEMPLATE_CATEGORY.WINDOW as 2),
    getTemplatesByCategory(TEMPLATE_CATEGORY.WHEEL as 3),
    getTemplatesByCategory(TEMPLATE_CATEGORY.MUSIC as 4),
  ]);

  // 全テンプレートのサムネイルを並列で解決
  const [resolvedBackground, resolvedWindow, resolvedWheel, resolvedMusic] = await Promise.all([
    Promise.all(background.map(resolveTemplateThumbnail)),
    Promise.all(window.map(resolveTemplateThumbnail)),
    Promise.all(wheel.map(resolveTemplateThumbnail)),
    Promise.all(music.map(resolveTemplateThumbnail)),
  ]);

  return {
    background: resolvedBackground,
    window: resolvedWindow,
    wheel: resolvedWheel,
    music: resolvedMusic,
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
 * 複数セグメントのテンプレート検証を一括で実行（旧仕様・後方互換性）
 * パフォーマンス最適化: 全IDを一度のクエリで取得
 * @deprecated 新しいvalidateVideoTemplatesを使用してください
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

// ============================================================================
// 新仕様: 60秒動画（背景6個 + 窓1個 + 車輪1個）
// ============================================================================

/**
 * 60秒動画用テンプレート入力型
 */
export type VideoTemplateIds = {
  backgrounds: number[];  // 6個の背景テンプレートID
  windowTemplateId: number;
  wheelTemplateId: number;
  musicTemplateId: number;  // 音楽テンプレートID（必須）
};

/**
 * 60秒動画用バリデーション結果型
 */
export type VideoTemplateValidationResult = {
  valid: boolean;
  error?: string;
  templates?: {
    backgrounds: Template[];  // 6個の背景テンプレート
    window: Template;
    wheel: Template;
    music: Template;  // 音楽テンプレート
  };
};

/**
 * 60秒動画のテンプレート検証
 * 背景6個 + 窓1個 + 車輪1個 + 音楽1個 を一括で検証
 */
export async function validateVideoTemplates(
  input: VideoTemplateIds
): Promise<VideoTemplateValidationResult> {
  const { backgrounds, windowTemplateId, wheelTemplateId, musicTemplateId } = input;

  // 背景が6個あることを確認
  if (backgrounds.length !== 6) {
    return { valid: false, error: "背景は6個選択してください" };
  }

  // 全IDを収集（重複除去）
  const allIds = [...new Set([...backgrounds, windowTemplateId, wheelTemplateId, musicTemplateId])];

  // 一括でテンプレートを取得（1クエリのみ）
  const templateMap = await getTemplatesByIds(allIds);

  // 背景テンプレートの検証
  const backgroundTemplates: Template[] = [];
  for (let i = 0; i < 6; i++) {
    const bgId = backgrounds[i];
    const bg = templateMap.get(bgId);

    if (!bg) {
      return { valid: false, error: `背景${i + 1}のテンプレートが見つかりません` };
    }
    if (bg.category !== TEMPLATE_CATEGORY.BACKGROUND) {
      return { valid: false, error: `背景${i + 1}のカテゴリが不正です` };
    }
    if (bg.isActive !== 1) {
      return { valid: false, error: `背景${i + 1}は現在利用できません` };
    }
    backgroundTemplates.push(bg);
  }

  // 窓テンプレートの検証
  const windowTemplate = templateMap.get(windowTemplateId);
  if (!windowTemplate) {
    return { valid: false, error: "窓テンプレートが見つかりません" };
  }
  if (windowTemplate.category !== TEMPLATE_CATEGORY.WINDOW) {
    return { valid: false, error: "窓テンプレートのカテゴリが不正です" };
  }
  if (windowTemplate.isActive !== 1) {
    return { valid: false, error: "窓テンプレートは現在利用できません" };
  }

  // 車輪テンプレートの検証
  const wheelTemplate = templateMap.get(wheelTemplateId);
  if (!wheelTemplate) {
    return { valid: false, error: "車輪テンプレートが見つかりません" };
  }
  if (wheelTemplate.category !== TEMPLATE_CATEGORY.WHEEL) {
    return { valid: false, error: "車輪テンプレートのカテゴリが不正です" };
  }
  if (wheelTemplate.isActive !== 1) {
    return { valid: false, error: "車輪テンプレートは現在利用できません" };
  }

  // 音楽テンプレートの検証
  const musicTemplate = templateMap.get(musicTemplateId);
  if (!musicTemplate) {
    return { valid: false, error: "音楽テンプレートが見つかりません" };
  }
  if (musicTemplate.category !== TEMPLATE_CATEGORY.MUSIC) {
    return { valid: false, error: "音楽テンプレートのカテゴリが不正です" };
  }
  if (musicTemplate.isActive !== 1) {
    return { valid: false, error: "音楽テンプレートは現在利用できません" };
  }

  return {
    valid: true,
    templates: {
      backgrounds: backgroundTemplates,
      window: windowTemplate,
      wheel: wheelTemplate,
      music: musicTemplate,
    },
  };
}
