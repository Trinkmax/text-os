"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useCommand } from "@/components/shell/command-context";
import { OrgSwitcher } from "@/components/shell/org-switcher";
import { NAV } from "@/lib/nav";
import { cn, initials, avatarGradient } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { signOutAction } from "@/app/actions/auth";
import { useTransition } from "react";
import { GradientAvatar } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

type Role = "admin" | "agent" | "readonly";
type Membership = { org_id: string; role: Role; name: string; logo_url: string | null };

export function MobileTopbar({
  orgId,
  orgName,
  orgLogo,
  userName,
  userEmail,
  role,
  memberships,
}: {
  orgId: string;
  orgName: string;
  orgLogo?: string | null;
  userName: string;
  userEmail: string;
  role: Role;
  memberships: Membership[];
}) {
  const pathname = usePathname();
  const { open } = useCommand();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  useEffect(() => setMounted(true), []);

  // Close the drawer whenever the route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "md:hidden glass sticky top-0 z-30 flex items-center gap-2 border-b border-[color:var(--border)] px-3",
        "pt-[max(env(safe-area-inset-top),0.25rem)] pb-2 h-[calc(56px+env(safe-area-inset-top))]",
      )}
    >
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Abrir menú"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-fg-2 hover:bg-bg-2 hover:text-fg"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0" hideClose>
          <SheetHeader className="pt-[max(env(safe-area-inset-top),1rem)]">
            <SheetTitle className="sr-only">Menú principal</SheetTitle>
            <OrgSwitcher
              currentOrgId={orgId}
              memberships={memberships}
              role={role}
            />
          </SheetHeader>
          <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 h-12 px-3 rounded-xl text-sm font-medium transition-colors",
                    active ? "bg-bg-3 text-fg" : "text-fg-2 hover:bg-bg-2 hover:text-fg"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-[color:var(--border)] px-3 py-3 flex items-center gap-3">
            <GradientAvatar name={userName} className="h-10 w-10" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{userName}</div>
              {userEmail && <div className="text-[11px] text-fg-4 truncate">{userEmail}</div>}
            </div>
            <button
              type="button"
              aria-label="Cerrar sesión"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await signOutAction();
                })
              }
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-fg-2 hover:bg-bg-2 hover:text-fg disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Link href="/inicio" className="flex items-center gap-2 min-w-0 flex-1" aria-label="Inicio">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-[0_4px_12px_rgba(139,92,246,0.3)]"
          style={{
            backgroundImage: orgLogo ? `url(${orgLogo})` : avatarGradient(orgName),
            backgroundSize: "cover",
          }}
        >
          {!orgLogo && initials(orgName)}
        </div>
        <span className="text-sm font-semibold truncate">{orgName}</span>
      </Link>

      <button
        type="button"
        aria-label="Buscar"
        onClick={open}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-fg-2 hover:bg-bg-2 hover:text-fg"
      >
        <Search className="h-5 w-5" />
      </button>
      {mounted && (
        <button
          type="button"
          aria-label="Cambiar tema"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-fg-2 hover:bg-bg-2 hover:text-fg"
        >
          {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      )}
    </header>
  );
}
