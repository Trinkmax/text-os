import { redirect } from "next/navigation";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { SwipeInbox } from "@/components/swipe/swipe-inbox";
import type { Json } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function SwipePage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();

  const [
    { data: pending },
    { data: autosent },
    { count: totalToday },
    { data: org },
    { count: generationProvidersCount },
  ] = await Promise.all([
    sb
      .from("textos_suggestions")
      .select(
        "id,proposed_text,confidence,semaphore,reason,status,created_at,conversation_id,org_id," +
          "textos_conversations!inner(id,channel,contact_id,last_message,last_message_at,textos_contacts!inner(id,name,avatar_url))",
      )
      .eq("org_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(40),
    sb
      .from("textos_suggestions")
      .select(
        "id,proposed_text,confidence,status,created_at,conversation_id,textos_conversations!inner(id,channel,textos_contacts!inner(name,avatar_url))",
      )
      .eq("org_id", orgId)
      .eq("status", "auto_sent")
      .order("created_at", { ascending: false })
      .limit(10),
    sb
      .from("textos_messages")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("direction", "out")
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    sb
      .from("textos_orgs")
      .select("shadow_mode")
      .eq("id", orgId)
      .single(),
    sb
      .from("textos_ai_providers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "generation")
      .eq("is_active", true),
  ]);

  const { data: learnedToday } = await sb
    .from("textos_knowledge_cards")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("origin", "learned")
    .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  const stats = {
    answeredToday: totalToday || 0,
    learnedToday: learnedToday?.length || 0,
    pending: pending?.length || 0,
  };

  // Pull last inbound + grounding cards in batch.
  const convIds = [...new Set((pending || []).map((p) => p.conversation_id))];
  const sugIds = (pending || []).map((p) => p.id);

  const lastInboundByConv: Record<string, string> = {};
  if (convIds.length) {
    const { data: msgs } = await sb
      .from("textos_messages")
      .select("conversation_id,body,created_at,direction")
      .in("conversation_id", convIds)
      .eq("direction", "in")
      .order("created_at", { ascending: false });
    for (const m of msgs || []) {
      if (!lastInboundByConv[m.conversation_id]) lastInboundByConv[m.conversation_id] = m.body;
    }
  }

  // Grounding por sugerencia: leemos los runs y mapeamos cardIds → cards.
  const groundingBySug: Record<string, Array<{ id: string; topic: string; question: string; answer: string }>> = {};
  if (sugIds.length) {
    type RunRow = { suggestion_id: string | null; factors: Json | null };
    const { data: runsRaw } = await sb
      .from("textos_ai_runs")
      .select("suggestion_id, factors")
      .in("suggestion_id", sugIds);
    const runs = (runsRaw ?? []) as unknown as RunRow[];
    const allCardIds = new Set<string>();
    const sugToCardIds: Record<string, string[]> = {};
    for (const r of runs) {
      const f = r.factors as { retrieval?: { cardIds?: string[] } } | null;
      const ids = f?.retrieval?.cardIds ?? [];
      if (r.suggestion_id) {
        sugToCardIds[r.suggestion_id] = ids;
        ids.forEach((i) => allCardIds.add(i));
      }
    }
    if (allCardIds.size > 0) {
      const { data: cardRows } = await sb
        .from("textos_knowledge_cards")
        .select("id, topic, question, answer")
        .eq("org_id", orgId)
        .in("id", [...allCardIds]);
      const byId = new Map((cardRows ?? []).map((c) => [c.id, c]));
      for (const sid of sugIds) {
        const ids = sugToCardIds[sid] ?? [];
        groundingBySug[sid] = ids
          .map((i) => byId.get(i))
          .filter(Boolean) as Array<{ id: string; topic: string; question: string; answer: string }>;
      }
    }
  }

  return (
    <SwipeInbox
      orgId={orgId}
      shadowMode={!!org?.shadow_mode}
      hasGenerationProvider={!!generationProvidersCount && generationProvidersCount > 0}
      initialPending={(pending || []).map((p) => ({
        id: p.id,
        proposedText: p.proposed_text || "",
        confidence: p.confidence,
        semaphore: p.semaphore as "green" | "amber" | "red",
        reason: p.reason,
        createdAt: p.created_at,
        conversationId: p.conversation_id,
        channel: (p as never as { textos_conversations: { channel: string } }).textos_conversations.channel,
        contactName: (p as never as { textos_conversations: { textos_contacts: { name: string } } }).textos_conversations.textos_contacts.name,
        contactAvatar: (p as never as { textos_conversations: { textos_contacts: { avatar_url?: string | null } } }).textos_conversations.textos_contacts.avatar_url || null,
        inboundMessage: lastInboundByConv[p.conversation_id] || "",
        groundingCards: groundingBySug[p.id] || [],
      }))}
      initialAutosent={(autosent || []).map((a) => ({
        id: a.id,
        proposedText: a.proposed_text || "",
        createdAt: a.created_at,
        conversationId: a.conversation_id,
        contactName: (a as never as { textos_conversations: { textos_contacts: { name: string } } }).textos_conversations.textos_contacts.name,
      }))}
      stats={stats}
    />
  );
}
