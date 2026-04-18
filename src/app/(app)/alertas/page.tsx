import { AlertsView } from "@/components/alerts/alerts-view";
import { getCurrentOrgId } from "@/lib/org";
import { redirect } from "next/navigation";

export default async function AlertasPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  return <AlertsView />;
}
