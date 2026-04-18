import { redirect } from "next/navigation";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shell/sidebar";
import { AppHeader } from "@/components/shell/header";
import { CommandProvider } from "@/components/shell/command-context";
import { CommandPalette } from "@/components/shell/command-palette";
import { NavShortcuts } from "@/components/shell/nav-shortcuts";
import { FocusProvider } from "@/components/shell/focus-context";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");

  const sb = await createSbServer();
  const { data: org } = await sb
    .from("textos_orgs")
    .select("id,name,logo_url,owner_display_name,onboarding_completed")
    .eq("id", orgId)
    .single();

  if (!org) redirect("/onboarding");
  if (!org.onboarding_completed) redirect("/onboarding");

  const { data: sugs } = await sb
    .from("textos_suggestions")
    .select("semaphore,status")
    .eq("org_id", orgId)
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
          userName={org.owner_display_name || "Tú"}
          orgId={orgId}
          initialCounts={counts}
        >
          {children}
        </AppShell>
        <CommandPalette orgId={orgId} />
      </FocusProvider>
    </CommandProvider>
  );
}
