import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { getCurrentOrgId } from "@/lib/org";
import { redirect } from "next/navigation";

export default async function CampanasPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  return <CampaignsView />;
}
