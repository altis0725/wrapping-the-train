import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { COOKIE_NAME } from "@/lib/auth/constants";
import { cookies } from "next/headers";
import { uploadTemplateVideo } from "@/lib/storage/upload";
import { isStorageConfigured } from "@/lib/storage/client";
import { isAdminOpenId } from "@/lib/auth/admin";
import { generateThumbnail } from "@/lib/storage/thumbnail";
import { TEMPLATE_CATEGORY } from "@/db/schema";

// 最大ファイルサイズ: 500MB
export const maxDuration = 300; // 5分のタイムアウト

/**
 * テンプレート動画のアップロード
 * POST /api/admin/templates/upload
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 管理者チェック (SSOTはsrc/lib/auth/admin.ts)
    if (!isAdminOpenId(session.openId)) {
      return NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 }
      );
    }

    // ストレージ設定チェック
    if (!isStorageConfigured()) {
      return NextResponse.json(
        { error: "ストレージが設定されていません" },
        { status: 500 }
      );
    }

    // FormData からファイルを取得
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const categoryStr = formData.get("category") as string | null;
    const templateIdStr = formData.get("templateId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが指定されていません" },
        { status: 400 }
      );
    }

    if (!categoryStr) {
      return NextResponse.json(
        { error: "カテゴリが指定されていません" },
        { status: 400 }
      );
    }

    const category = parseInt(categoryStr, 10);
    // カテゴリ1-4を許可（1:車両, 2:窓, 3:車輪, 4:音楽）
    if (![1, 2, 3, 4].includes(category)) {
      return NextResponse.json(
        { error: "カテゴリが不正です" },
        { status: 400 }
      );
    }

    // templateId は新規作成時は 0 を使用
    const templateId = templateIdStr ? parseInt(templateIdStr, 10) : 0;
    if (!Number.isFinite(templateId) || templateId < 0) {
      return NextResponse.json(
        { error: "テンプレートIDが不正です" },
        { status: 400 }
      );
    }

    // アップロード実行
    const result = await uploadTemplateVideo(file, category, templateId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // サムネイル生成（音楽カテゴリはスキップ）
    let thumbnailStorageKey: string | undefined;
    if (result.storageKey && category !== TEMPLATE_CATEGORY.MUSIC) {
      const thumbnailResult = await generateThumbnail(
        result.storageKey,
        category,
        templateId
      );
      if (thumbnailResult.success) {
        thumbnailStorageKey = thumbnailResult.storageKey;
      } else {
        // サムネイル生成に失敗してもアップロード自体は成功とする
        console.warn(
          "[POST /api/admin/templates/upload] Thumbnail generation failed:",
          thumbnailResult.error
        );
      }
    }

    return NextResponse.json({
      success: true,
      storageKey: result.storageKey,
      thumbnailStorageKey,
    });
  } catch (error) {
    console.error("[POST /api/admin/templates/upload] Error:", error);
    return NextResponse.json(
      { error: "アップロードに失敗しました" },
      { status: 500 }
    );
  }
}
