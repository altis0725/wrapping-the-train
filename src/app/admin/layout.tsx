import "server-only";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { COOKIE_NAME } from "@/lib/auth/constants";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { cookies } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // セッション検証（middlewareと同じロジック、DBアクセスなし）
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);

  // 認証チェック（middlewareで既にチェック済みだが念のため）
  if (!session) {
    redirect("/login?returnTo=/admin");
  }

  // Admin権限チェック（middlewareで既にチェック済みだが念のため）
  // 複数管理者対応: ADMIN_OPEN_IDS (カンマ区切り)
  const adminOpenIds = (process.env.ADMIN_OPEN_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!adminOpenIds.includes(session.openId)) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
