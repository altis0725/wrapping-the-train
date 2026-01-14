import "server-only";

import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { COOKIE_NAME } from "@/lib/auth/constants";
import { getAllTemplates } from "@/actions/template";
import { CreateVideoForm } from "@/components/create/create-video-form";
import { cookies } from "next/headers";

export const metadata = {
  title: "動画を作成 | WRAPPING THE TRAIN",
  description: "あなただけのオリジナル動画を作成しましょう",
};

export default async function CreatePage() {
  // セッション検証（middlewareで既にチェック済みだが念のため）
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);

  if (!session) {
    redirect("/login?callbackUrl=/create");
  }

  const templates = await getAllTemplates();

  return (
    <main className="container max-w-6xl py-8">
      <div className="glass-panel p-8 rounded-2xl border-white/5 animate-fade-in-up">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold font-orbitron text-glow">
              動画を作成
            </h1>
            <p className="text-slate-400">
              3つのテンプレートを選んで、あなただけの動画を作りましょう
            </p>
          </div>

          <CreateVideoForm templates={templates} />
        </div>
      </div>
    </main>
  );
}
