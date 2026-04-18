import { redirect } from "next/navigation";
import { getCurrentOrgId } from "@/lib/org";
import { FlowsView } from "@/components/flows/flows-view";

export const dynamic = "force-dynamic";

export default async function FlujosPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  return <FlowsView />;
}
