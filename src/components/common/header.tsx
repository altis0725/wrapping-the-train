"use client";

import Link from "next/link";
import { Train, Menu, X, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

const navigation = [
  { name: "動画作成", href: "/create" },
  { name: "マイページ", href: "/mypage" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        scrolled
          ? "bg-black/80 backdrop-blur-xl border-cyan-900/30 py-2 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          : "bg-transparent border-transparent py-4"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-900/50 to-slate-900/50 border border-cyan-500/30 group-hover:border-cyan-400/60 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Train className="h-6 w-6 text-cyan-400 group-hover:text-cyan-200 transition-colors" />
            </div>
            <span className="font-bold text-xl tracking-tighter font-orbitron bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:to-cyan-200 transition-all">
              WRAPPING THE TRAIN
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:gap-x-12">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="relative text-base font-bold leading-6 text-slate-300 hover:text-white transition-colors group py-2 tracking-wide font-sans"
            >
              {item.name}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-500 group-hover:w-full transition-all duration-300 ease-out" />
            </Link>
          ))}
        </div>

        {/* Desktop Login Button */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Button
            asChild
            className="rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50 hover:text-cyan-100 hover:border-cyan-400/50 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-sm"
          >
            <Link href="/login" className="px-6 font-orbitron tracking-wide">
              LOGIN
            </Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-slate-300 hover:text-white"
          >
            <span className="sr-only">メニューを開く</span>
            {mobileMenuOpen ? (
              <X className="h-7 w-7" aria-hidden="true" />
            ) : (
              <Menu className="h-7 w-7" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed inset-x-0 top-[60px] z-50 p-4"
          >
            <div className="rounded-2xl bg-[#020617]/95 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden ring-1 ring-white/5">
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="group flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium text-slate-200 hover:bg-white/5 hover:text-white transition-all"
                    >
                      {item.name}
                      <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/10">
                  <Button asChild className="w-full h-12 text-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      ログイン
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
