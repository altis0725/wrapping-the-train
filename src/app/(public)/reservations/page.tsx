import "server-only";

import Link from "next/link";
import { Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Coming Soon | WRAPPING THE TRAIN",
  description: "投影予約サービスは準備中です。近日公開予定。",
};

export default function ReservationsPage() {
  return (
    <main className="container max-w-2xl mx-auto py-8">
      <div className="glass-panel p-8 rounded-2xl border-white/5 animate-fade-in-up">
        <div className="space-y-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Clock className="w-10 h-10 text-purple-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold font-orbitron text-glow">Coming Soon</h1>
              <p className="text-xl text-slate-300">
                投影予約機能は準備中です
              </p>
            </div>
            <p className="text-slate-400 max-w-md mx-auto">
              投影予約サービスは近日公開予定です。<br />
              まずは無料で動画作成をお楽しみください。
            </p>
            <div className="pt-4">
              <Button asChild className="bg-cyan-600 hover:bg-cyan-500">
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  トップページへ戻る
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
