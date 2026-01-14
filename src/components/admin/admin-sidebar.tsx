"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Film,
  Calendar,
  CalendarClock,
  FileText,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  {
    title: "ダッシュボード",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "テンプレート",
    href: "/admin/templates",
    icon: Film,
  },
  {
    title: "予約管理",
    href: "/admin/reservations",
    icon: Calendar,
  },
  {
    title: "スケジュール",
    href: "/admin/schedules",
    icon: CalendarClock,
  },
  {
    title: "監査ログ",
    href: "/admin/audit-logs",
    icon: FileText,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const NavContent = () => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* デスクトップサイドバー */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-background p-4">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            サイトに戻る
          </Link>
        </div>
        <h2 className="text-lg font-semibold mb-4">管理画面</h2>
        <NavContent />
      </aside>

      {/* モバイルサイドバー */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-4 border-b bg-background p-4">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle>管理画面</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <NavContent />
            </div>
            <div className="mt-6">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                <ChevronLeft className="h-4 w-4" />
                サイトに戻る
              </Link>
            </div>
          </SheetContent>
        </Sheet>
        <span className="font-semibold">管理画面</span>
      </div>
      {/* モバイル用のスペーサー */}
      <div className="md:hidden h-16" />
    </>
  );
}
