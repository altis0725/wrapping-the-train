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
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">動画を作成</h1>
          <p className="text-muted-foreground">
            3つのテンプレートを選んで、あなただけの動画を作りましょう
          </p>
        </div>

        <CreateVideoForm templates={templates} />
      </div>
    </main>
  );
}
