import { ReportsView } from "@/components/reports/reports-view";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function ReportesPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();

  const since = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const prevSince = new Date(Date.now() - 14 * DAY_MS).toISOString();

  const [
    { data: org },
    { data: gaps },
    { data: cards },
    { data: recentSuggestions },
    { count: convNewCount },
    { count: convPrevCount },
    { data: stages },
    { data: contacts },
  ] = await Promise.all([
    sb.from("textos_orgs").select("coverage_estimate").eq("id", orgId).single(),
    sb.from("textos_scope_gaps").select("*").eq("org_id", orgId).order("count", { ascending: false }).limit(5),
    sb.from("textos_knowledge_cards").select("topic,usage_count").eq("org_id", orgId).order("usage_count", { ascending: false }).limit(5),
    sb
      .from("textos_suggestions")
      .select("created_at,semaphore,status")
      .eq("org_id", orgId)
      .gte("created_at", since),
    sb
      .from("textos_conversations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", since),
    sb
      .from("textos_conversations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", prevSince)
      .lt("created_at", since),
    sb.from("textos_stages").select("id,name,position").eq("org_id", orgId).order("position"),
    sb.from("textos_contacts").select("stage").eq("org_id", orgId),
  ]);

  // Build last-7-days daily semáforo buckets
  const dayKeys: string[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const labels = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
  const buckets = dayKeys.map((k) => ({
    key: k,
    label: labels[new Date(k).getDay()],
    green: 0,
    amber: 0,
    red: 0,
  }));
  for (const s of recentSuggestions || []) {
    const d = (s.created_at || "").slice(0, 10);
    const b = buckets.find((x) => x.key === d);
    if (!b) continue;
    if (s.status === "auto_sent") b.green += 1;
    else if (s.semaphore === "amber") b.amber += 1;
    else if (s.semaphore === "red") b.red += 1;
    else if (s.semaphore === "green") b.green += 1;
  }

  // Funnel by stage — count contacts per stage in pipeline order
  const stageCounts: Record<string, number> = {};
  for (const c of contacts || []) {
    const key = c.stage || "";
    stageCounts[key] = (stageCounts[key] ?? 0) + 1;
  }
  const funnel = (stages || []).map((s) => ({
    label: s.name,
    value: stageCounts[s.id] ?? stageCounts[s.name] ?? 0,
  }));

  const newConversations = convNewCount ?? 0;
  const prevConversations = convPrevCount ?? 0;
  const convDelta =
    prevConversations > 0
      ? Math.round(((newConversations - prevConversations) / prevConversations) * 100)
      : null;

  return (
    <ReportsView
      coverage={org?.coverage_estimate ?? 0}
      topGaps={gaps || []}
      topTopics={cards || []}
      historical={buckets.map((b) => ({ day: b.label, green: b.green, amber: b.amber, red: b.red }))}
      funnel={funnel}
      newConversations={newConversations}
      newConversationsDelta={convDelta}
    />
  );
}
