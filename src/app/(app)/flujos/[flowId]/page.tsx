import { notFound, redirect } from "next/navigation";
import { getCurrentOrgId } from "@/lib/org";
import { getFlow, listFlows } from "@/app/actions/flows";
import { FlowEditor } from "@/components/flows/flow-editor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ flowId: string }> };

export default async function FlujoEditorPage({ params }: Props) {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");

  const { flowId } = await params;
  const [flowRes, flowsRes] = await Promise.all([getFlow(flowId), listFlows()]);
  if (!flowRes.ok) return notFound();

  const flows = flowsRes.ok ? flowsRes.flows : [];
  return (
    <FlowEditor
      flow={flowRes.flow}
      versions={flowRes.versions}
      allFlows={flows.map((f) => ({ id: f.id, name: f.name, active: f.active }))}
    />
  );
}
