import Link from "next/link";
import { Train } from "lucide-react";

const footerLinks = {
  service: [
    { name: "動画作成", href: "/create" },
    { name: "マイページ", href: "/mypage" },
  ],
  legal: [
    { name: "利用規約", href: "/terms" },
    { name: "プライバシーポリシー", href: "/privacy" },
    { name: "特定商取引法に基づく表記", href: "/law" },
  ],
  support: [
    { name: "お問い合わせ", href: "/contact" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Train className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl">WRAPPING THE TRAIN</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              水間鉄道の車両にあなたの動画を投影する、
              <br />
              特別な体験を。
            </p>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 xl:col-span-2 xl:mt-0">
            <div>
              <h3 className="text-sm font-semibold">サービス</h3>
              <ul role="list" className="mt-4 space-y-3">
                {footerLinks.service.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold">法的情報</h3>
              <ul role="list" className="mt-4 space-y-3">
                {footerLinks.legal.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold">サポート</h3>
              <ul role="list" className="mt-4 space-y-3">
                {footerLinks.support.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t pt-8">
          <p className="text-xs text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} 水間鉄道株式会社. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
