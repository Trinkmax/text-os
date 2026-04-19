"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Home,
  Layers,
  MessagesSquare,
  Bell,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SemaphoreCounter } from "@/components/shell/semaphore-badge";

const PRIMARY: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/swipe", label: "Swipe", icon: Layers },
  { href: "/conversaciones", label: "Chat", icon: MessagesSquare },
  { href: "/alertas", label: "Alertas", icon: Bell },
];

const PRIMARY_HREFS = new Set(PRIMARY.map((t) => t.href));

export function MobileTabBar({
  orgId,
  initialCounts,
}: {
  orgId: string;
  initialCounts: { green: number; amber: number; red: number };
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const secondary = NAV.filter((n) => !PRIMARY_HREFS.has(n.href));
  const moreActive = secondary.some((s) => pathname === s.href || pathname.startsWith(s.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <nav
      role="tablist"
      aria-label="Navegación principal"
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-30 glass border-t border-[color:var(--border)]",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <div className="flex items-stretch h-14">
        {PRIMARY.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              role="tab"
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-1 min-w-0 select-none",
                "transition-colors duration-150",
                active ? "text-fg" : "text-fg-3 hover:text-fg-2"
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-tab-active"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-b-full bg-brand"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              role="tab"
              aria-current={moreActive ? "page" : undefined}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-1 min-w-0 select-none",
                "transition-colors duration-150",
                moreActive ? "text-fg" : "text-fg-3 hover:text-fg-2"
              )}
            >
              {moreActive && (
                <motion.span
                  layoutId="mobile-tab-active"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-b-full bg-brand"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">Más</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 max-h-[80dvh]">
            <SheetHeader>
              <SheetTitle>Más</SheetTitle>
              <div className="pt-2">
                <SemaphoreCounter initial={initialCounts} orgId={orgId} />
              </div>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2 p-4 overflow-y-auto">
              {secondary.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 h-14 px-3 rounded-xl border text-sm font-medium transition-colors",
                      active
                        ? "border-brand/60 bg-brand/10 text-fg"
                        : "border-[color:var(--border)] bg-bg-2 text-fg-2 hover:text-fg"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
