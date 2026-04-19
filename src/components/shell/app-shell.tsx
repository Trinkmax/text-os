"use client";

import { Sidebar } from "@/components/shell/sidebar";
import { AppHeader } from "@/components/shell/header";
import { MobileTopbar } from "@/components/shell/mobile-topbar";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import { useFocus } from "@/components/shell/focus-context";
import { TexFloating } from "@/components/tex";

type Role = "admin" | "agent" | "readonly";
type Membership = { org_id: string; role: Role; name: string; logo_url: string | null };

export function AppShell({
  orgName,
  orgLogo,
  userName,
  userEmail,
  orgId,
  role,
  memberships,
  initialCounts,
  children,
}: {
  orgName: string;
  orgLogo?: string | null;
  userName: string;
  userEmail: string;
  orgId: string;
  role: Role;
  memberships: Membership[];
  initialCounts: { green: number; amber: number; red: number };
  children: React.ReactNode;
}) {
  const { focus } = useFocus();
  return (
    <div className="flex min-h-[100dvh] bg-bg-0 text-fg">
      <Sidebar
        orgName={orgName}
        orgLogo={orgLogo}
        compact={focus}
        memberships={memberships}
        currentOrgId={orgId}
        role={role}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {!focus && (
          <>
            <AppHeader
              orgId={orgId}
              orgName={orgName}
              userName={userName}
              userEmail={userEmail}
              initialCounts={initialCounts}
            />
            <MobileTopbar
              orgId={orgId}
              orgName={orgName}
              orgLogo={orgLogo}
              userName={userName}
              userEmail={userEmail}
              role={role}
              memberships={memberships}
            />
          </>
        )}
        <main className="flex-1 flex flex-col min-w-0 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>
      {!focus && <MobileTabBar orgId={orgId} initialCounts={initialCounts} />}
      <TexFloating />
    </div>
  );
}
