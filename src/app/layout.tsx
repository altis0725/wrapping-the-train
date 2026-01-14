import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";

export const metadata: Metadata = {
  title: "WRAPPING THE TRAIN | 水間鉄道プロジェクションマッピング",
  description:
    "水間鉄道の夜間停車車両にあなたの動画をプロジェクションマッピングで投影する特別な体験。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body className="antialiased font-sans">
        {/* 固定背景 */}
        <div className="fixed inset-0 z-0">
          <img
            src="/img/night_train.png"
            alt=""
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-black/60" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#020617]/30 to-[#020617]" />
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
