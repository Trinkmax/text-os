import { redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/org";
import { getAiHealth } from "@/app/actions/ai-insights";
import { AiHealthView } from "@/components/reports/ai-health-view";

export const dynamic = "force-dynamic";

export default async function AiHealthPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const active = await getActiveOrg();
  if (!active) redirect("/onboarding");
  // Admin-only — el patrón ya usado en otras vistas sensibles.
  if (active.role !== "admin") redirect("/reportes");

  const params = (await searchParams) ?? {};
  const days = params.range === "1" ? 1 : params.range === "30" ? 30 : 7;
  const health = await getAiHealth({ days: days as 1 | 7 | 30 });

  return <AiHealthView orgId={active.org.id} initialHealth={health} initialRange={days} />;
}
