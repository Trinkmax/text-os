"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { OrgSwitcher } from "@/components/shell/org-switcher";

type Role = "admin" | "agent" | "readonly";
type Membership = { org_id: string; role: Role; name: string; logo_url: string | null };

export function Sidebar({
  orgName: _orgName,
  orgLogo: _orgLogo,
  compact = false,
  memberships,
  currentOrgId,
  role,
}: {
  orgName: string;
  orgLogo?: string | null;
  compact?: boolean;
  memberships: Membership[];
  currentOrgId: string;
  role: Role;
}) {
  const pathname = usePathname();
  return (
    <TooltipProvider delayDuration={150}>
      <motion.aside
        animate={{ width: compact ? 68 : 248 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="sticky top-0 h-screen flex flex-col bg-bg-1 border-r border-[color:var(--border)] shrink-0 overflow-hidden z-20"
      >
        <div className="flex items-center h-14 px-2 border-b border-[color:var(--border)] shrink-0">
          <OrgSwitcher
            currentOrgId={currentOrgId}
            memberships={memberships}
            role={role}
            compact={compact}
          />
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar py-3 px-2 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 h-10 px-2.5 rounded-xl transition-all text-sm font-medium",
                  active ? "text-fg bg-bg-3" : "text-fg-2 hover:text-fg hover:bg-bg-2"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-brand"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!compact && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-[10px] text-fg-4 font-mono group-hover:text-fg-3 transition">{item.shortcut}</span>
                    )}
                  </>
                )}
              </Link>
            );
            return compact ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  <div className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </nav>

        {!compact && (
          <div className="p-3 border-t border-[color:var(--border)] shrink-0">
            <div className="rounded-xl bg-bg-2 border border-[color:var(--border)] p-3">
              <div className="flex items-center gap-2 text-xs text-fg-3 mb-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" /> IA entrenándose
              </div>
              <div className="text-[11px] text-fg-4 leading-snug">
                Cada respuesta tuya mejora las próximas sugerencias automáticas.
              </div>
            </div>
          </div>
        )}
      </motion.aside>
    </TooltipProvider>
  );
}
