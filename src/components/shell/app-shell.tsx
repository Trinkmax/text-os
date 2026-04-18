"use client";

import { Sidebar } from "@/components/shell/sidebar";
import { AppHeader } from "@/components/shell/header";
import { useFocus } from "@/components/shell/focus-context";

export function AppShell({
  orgName,
  orgLogo,
  userName,
  orgId,
  initialCounts,
  children,
}: {
  orgName: string;
  orgLogo?: string | null;
  userName: string;
  orgId: string;
  initialCounts: { green: number; amber: number; red: number };
  children: React.ReactNode;
}) {
  const { focus } = useFocus();
  return (
    <div className="flex min-h-screen bg-bg-0 text-fg">
      <Sidebar orgName={orgName} orgLogo={orgLogo} compact={focus} />
      <div className="flex-1 flex flex-col min-w-0">
        {!focus && (
          <AppHeader orgId={orgId} orgName={orgName} userName={userName} initialCounts={initialCounts} />
        )}
        <main className="flex-1 flex flex-col min-w-0">{children}</main>
      </div>
    </div>
  );
}
