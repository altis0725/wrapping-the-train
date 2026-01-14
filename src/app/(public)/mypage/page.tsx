import "server-only";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { COOKIE_NAME } from "@/lib/auth/constants";
import { getUserVideosWithTemplates } from "@/actions/video";
import { getUserReservations } from "@/actions/reservation";
import { getUserPayments } from "@/actions/payment";
import { MyPageContent } from "@/components/mypage/mypage-content";
import { cookies } from "next/headers";

export default async function MyPage() {
  // セッション検証（middlewareで既にチェック済みだが念のため）
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);

  if (!session) {
    redirect("/login?returnTo=/mypage");
  }

  const [videos, reservations, payments] = await Promise.all([
    getUserVideosWithTemplates(),
    getUserReservations(),
    getUserPayments(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">マイページ</h1>
      <MyPageContent
        videos={videos}
        reservations={reservations}
        payments={payments}
      />
    </div>
  );
}
