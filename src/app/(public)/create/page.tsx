import "server-only";

import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { COOKIE_NAME } from "@/lib/auth/constants";
import { getAllTemplatesWithThumbnails } from "@/actions/template";
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

  const templates = await getAllTemplatesWithThumbnails();

  return (
    <main className="relative min-h-screen py-24 sm:py-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="container relative z-10 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 md:p-12 rounded-3xl border-white/10 animate-fade-in-up shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black/40 backdrop-blur-xl">
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold font-orbitron text-glow bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                CREATE VIDEO
              </h1>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                3つのテンプレートを選んで、あなただけの動画を作りましょう。<br />
                プレビューを見ながら直感的に操作できます。
              </p>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur opacity-30" />
              <div className="relative">
                <CreateVideoForm templates={templates} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
