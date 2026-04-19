import { redirect } from "next/navigation";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { FlowsView } from "@/components/flows/flows-view";

export const dynamic = "force-dynamic";

type RawNode = {
  id: string;
  type: string;
  x: number;
  y: number;
  title: string;
  summary: string;
  semaphore: "green" | "amber" | "red";
};
type RawEdge = { from: string; to: string };

export default async function FlujosPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();
  const { data: flow } = await sb
    .from("textos_flows")
    .select("id,name,nodes,edges")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nodes = (flow?.nodes as unknown as RawNode[]) || [];
  const edges = (flow?.edges as unknown as RawEdge[]) || [];
  return (
    <FlowsView
      flowName={flow?.name ?? null}
      initialNodes={nodes}
      initialEdges={edges}
    />
  );
}
