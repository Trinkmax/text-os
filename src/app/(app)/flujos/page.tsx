import { redirect } from "next/navigation";
import { getCurrentOrgId } from "@/lib/org";
import { listFlows } from "@/app/actions/flows";
import { FlowsList } from "@/components/flows/list/flows-list";

export const dynamic = "force-dynamic";

export default async function FlujosPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");

  const res = await listFlows();
  const flows = res.ok ? res.flows : [];
  return <FlowsList flows={flows} />;
}
