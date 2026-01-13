import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/actions/reservation";

/**
 * Cron: 期限切れの仮押さえを自動解放
 *
 * 実行頻度: 毎分（Railway/Vercel Cron）
 *
 * 認証:
 * - CRON_SECRET ヘッダーで認証
 * - または Vercel の内部呼び出し
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET は必須（セキュリティ強化）
  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const releasedCount = await releaseExpiredHolds();

    console.log(`[Cron] Released ${releasedCount} expired holds`);

    return NextResponse.json({
      success: true,
      releasedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error releasing holds:", error);
    return NextResponse.json(
      { error: "Failed to release expired holds" },
      { status: 500 }
    );
  }
}

// POST も許可（一部の Cron サービス用）
export async function POST(request: NextRequest) {
  return GET(request);
}
