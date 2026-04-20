import { redirect } from "next/navigation";
import { getCurrentOrgId } from "@/lib/org";
import { NewFlowForm } from "@/components/flows/list/new-flow-form";

export const dynamic = "force-dynamic";

export default async function NuevoFlujoPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  return <NewFlowForm />;
}
