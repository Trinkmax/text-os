import { redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { CommandProvider } from "@/components/shell/command-context";
import { CommandPalette } from "@/components/shell/command-palette";
import { NavShortcuts } from "@/components/shell/nav-shortcuts";
import { FocusProvider } from "@/components/shell/focus-context";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const active = await getActiveOrg();
  if (!active) redirect("/onboarding");
  if (!active.org.onboarding_completed) redirect("/onboarding");

  const { org, role, memberships } = active;

  const sb = await createSbServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const { data: sugs } = await sb
    .from("textos_suggestions")
    .select("semaphore,status")
    .eq("org_id", org.id)
    .in("status", ["pending", "auto_sent"]);

  const counts = { green: 0, amber: 0, red: 0 };
  for (const s of sugs || []) {
    if (s.status === "auto_sent") counts.green += 1;
    else if (s.semaphore === "amber") counts.amber += 1;
    else if (s.semaphore === "red") counts.red += 1;
  }

  return (
    <CommandProvider>
      <FocusProvider>
        <NavShortcuts />
        <AppShell
          orgName={org.name}
          orgLogo={org.logo_url}
          userName={org.owner_display_name || user?.email?.split("@")[0] || "Tú"}
          userEmail={user?.email ?? ""}
          orgId={org.id}
          role={role}
          memberships={memberships}
          initialCounts={counts}
        >
          {children}
        </AppShell>
        <CommandPalette orgId={org.id} />
      </FocusProvider>
    </CommandProvider>
  );
}
