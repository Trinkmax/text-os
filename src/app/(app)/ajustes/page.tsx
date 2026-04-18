import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();
  const { data: org } = await sb.from("textos_orgs").select("*").eq("id", orgId).single();
  const { data: channels } = await sb.from("textos_channels").select("*").eq("org_id", orgId);
  return <SettingsView org={org as never} channels={(channels as never) || []} />;
}
