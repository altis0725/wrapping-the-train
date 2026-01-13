"use server";

import { db } from "@/db";
import { templates, TEMPLATE_CATEGORY, type Template } from "@/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";

export type TemplateWithCategory = Template & {
  categoryName: string;
};


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
