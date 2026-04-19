import { AlertsView } from "@/components/alerts/alerts-view";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();
  const { data: alerts } = await sb
    .from("textos_alerts")
    .select("id,name,condition,notify,enabled,created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  return <AlertsView alerts={alerts || []} />;
}
