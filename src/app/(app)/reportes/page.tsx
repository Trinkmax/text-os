import { ReportsView } from "@/components/reports/reports-view";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();
  const { data: org } = await sb.from("textos_orgs").select("coverage_estimate").eq("id", orgId).single();
  const { data: gaps } = await sb.from("textos_scope_gaps").select("*").eq("org_id", orgId).order("count", { ascending: false }).limit(5);
  const { data: cards } = await sb.from("textos_knowledge_cards").select("topic,usage_count").eq("org_id", orgId).order("usage_count", { ascending: false }).limit(5);
  return <ReportsView coverage={org?.coverage_estimate ?? 72} topGaps={gaps || []} topTopics={cards || []} />;
}
