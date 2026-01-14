import Link from "next/link";
import { Train, Twitter, Instagram, Facebook } from "lucide-react";

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

const socialLinks = [
  { name: "Twitter", href: "#", icon: Twitter },
  { name: "Instagram", href: "#", icon: Instagram },
  { name: "Facebook", href: "#", icon: Facebook },
];

export function Footer() {
  return (
    <footer className="relative bg-[#020617] border-t border-cyan-900/30 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl translate-y-1/2" />

      <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Brand Section */}
          <div className="space-y-4 mb-12 xl:mb-0">
            <Link href="/" className="flex items-center gap-3 w-fit group">
              <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/30 group-hover:border-cyan-400/50 transition-colors">
                <Train className="h-6 w-6 text-cyan-400" />
              </div>
              <span className="font-bold text-xl font-orbitron tracking-wider text-slate-100">
                WRAPPING THE TRAIN
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              水間鉄道の車両にあなたの動画を投影する、<br />
              一夜限りの特別なデジタルアート体験。
            </p>
            <div className="flex space-x-4 pt-2">
              {socialLinks.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-slate-500 hover:text-cyan-400 transition-colors transform hover:-translate-y-1 duration-300"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 xl:col-span-2">
            <div>
              <h3 className="text-sm font-semibold text-white font-orbitron tracking-wider border-b border-cyan-900/50 pb-2 mb-4 w-fit">
                SERVICE
              </h3>
              <ul role="list" className="space-y-3">
                {footerLinks.service.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-slate-400 hover:text-cyan-300 transition-colors hover:pl-1 duration-200 block"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white font-orbitron tracking-wider border-b border-cyan-900/50 pb-2 mb-4 w-fit">
                LEGAL
              </h3>
              <ul role="list" className="space-y-3">
                {footerLinks.legal.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-slate-400 hover:text-cyan-300 transition-colors hover:pl-1 duration-200 block"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h3 className="text-sm font-semibold text-white font-orbitron tracking-wider border-b border-cyan-900/50 pb-2 mb-4 w-fit">
                SUPPORT
              </h3>
              <ul role="list" className="space-y-3">
                {footerLinks.support.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-slate-400 hover:text-cyan-300 transition-colors hover:pl-1 duration-200 block"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/5 pt-8">
          <p className="text-xs text-slate-500 text-center font-orbitron tracking-wide">
            &copy; {new Date().getFullYear()} MIZUMA RAILWAY Co.,Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
