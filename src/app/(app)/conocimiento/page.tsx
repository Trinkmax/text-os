import { redirect } from "next/navigation";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { KnowledgeView } from "@/components/knowledge/knowledge-view";

export const dynamic = "force-dynamic";

export default async function ConocimientoPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();
  const [{ data: cards }, { data: gaps }] = await Promise.all([
    sb.from("textos_knowledge_cards").select("*").eq("org_id", orgId).order("usage_count", { ascending: false }),
    sb.from("textos_scope_gaps").select("*").eq("org_id", orgId).is("resolved_card_id", null).order("count", { ascending: false }).limit(6),
  ]);
  return <KnowledgeView cards={cards || []} gaps={gaps || []} />;
}
