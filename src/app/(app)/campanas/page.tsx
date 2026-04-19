import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CampanasPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();
  const { data: campaigns } = await sb
    .from("textos_campaigns")
    .select("id,name,status,scheduled_at,stats")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);
  const { count: contactsCount } = await sb
    .from("textos_contacts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  return <CampaignsView campaigns={campaigns || []} contactsCount={contactsCount ?? 0} />;
}
