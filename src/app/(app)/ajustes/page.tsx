import { redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { listTeamData } from "@/app/actions/team";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

export default async function AjustesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const active = await getActiveOrg();
  if (!active) redirect("/onboarding");

  const sb = await createSbServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const { data: org } = await sb.from("textos_orgs").select("*").eq("id", active.org.id).single();
  const { data: channels } = await sb
    .from("textos_channels")
    .select(
      "id, type, status, label, external_id, config, verified_at, last_error, created_at, updated_at"
    )
    .eq("org_id", active.org.id)
    .order("created_at", { ascending: true });
  const team = await listTeamData();
  const params = (await searchParams) ?? {};

  return (
    <SettingsView
      org={org as never}
      channels={(channels as never) || []}
      team={team}
      role={active.role}
      currentUserId={user?.id ?? ""}
      initialSection={params.tab === "equipo" ? "team" : undefined}
    />
  );
}
