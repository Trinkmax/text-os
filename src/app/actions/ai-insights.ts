"use server";

// Server actions de lectura para el dashboard de salud y la pestaña de
// grounding de una sugerencia. Sólo lecturas + agregaciones simples; el
// cálculo de percentiles se hace en JS para evitar funciones agregadas
// no portables.

import { createSbServer } from "@/lib/supabase/server";
import { requireOrgId, requireAdminOrgId } from "@/lib/org";
import { humanizeProviderError } from "@/lib/ai/errors";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AiHealth = {
  rangeDays: number;
  totals: {
    runs: number;
    suggestions: number;
    autosent: number;
    pending: number;
    escalated: number;
  };
  rates: {
    autopilot: number; // 0..1
    escalation: number; // 0..1
    failure: number; // 0..1
  };
  latency: Record<
    "embed" | "classify" | "retrieve" | "generate" | "ground" | "total",
    { p50: number; p95: number; samples: number }
  >;
  cost: {
    totalUsd: number;
    byKind: Record<string, number>;
  };
  providers: Array<{
    id: string;
    nickname: string;
    provider: string;
    model: string;
    role: string;
    is_default: boolean;
    is_active: boolean;
    last_test_ok: boolean | null;
    last_test_error: string | null;
    recent_calls: number;
    recent_errors: number;
    health: "ok" | "warn" | "down";
  }>;
  topCards: Array<{ id: string; topic: string; question: string; usage_count: number }>;
  recentAutosends: Array<{
    id: string;
    proposed_text: string;
    created_at: string;
    contact_name: string;
    confidence: number;
  }>;
  knowledge: {
    total: number;
    fresh: number;
    stale_or_failed: number;
  };
};

export async function getAiHealth(opts: { days?: 1 | 7 | 30 } = {}): Promise<AiHealth> {
  // Admin-only para no exponer datos agregados a agents/readonly.
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();
  const days = opts.days ?? 7;
  const since = new Date(Date.now() - days * DAY_MS).toISOString();

  const [
    { data: runs },
    { data: traces },
    { data: providers },
    { data: cards },
    { data: autosends },
    { data: kStats },
  ] = await Promise.all([
    sb
      .from("textos_ai_runs")
      .select("id, status, semaphore, started_at, ended_at, error")
      .eq("org_id", orgId)
      .gte("started_at", since),
    sb
      .from("textos_ai_traces")
      .select("kind, latency_ms, provider_id, cost_usd, error, created_at")
      .eq("org_id", orgId)
      .gte("created_at", since),
    sb
      .from("textos_ai_providers")
      .select("id, nickname, provider, model, role, is_default, is_active, last_test_ok, last_test_error")
      .eq("org_id", orgId),
    sb
      .from("textos_knowledge_cards")
      .select("id, topic, question, usage_count")
      .eq("org_id", orgId)
      .order("usage_count", { ascending: false })
      .limit(5),
    sb
      .from("textos_suggestions")
      .select(
        "id, proposed_text, created_at, confidence, conversation_id, textos_conversations!inner(textos_contacts!inner(name))",
      )
      .eq("org_id", orgId)
      .eq("status", "auto_sent")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(8),
    sb
      .from("textos_knowledge_cards")
      .select("embedding_state")
      .eq("org_id", orgId),
  ]);

  // ---- Totales y rates ----
  const totals = {
    runs: runs?.length ?? 0,
    suggestions: 0,
    autosent: 0,
    pending: 0,
    escalated: 0,
  };
  let failed = 0;
  for (const r of runs ?? []) {
    if (r.status === "failed") failed += 1;
    if (r.semaphore === "green") {
      // Aproximamos: las verdes con suggestion_id se mandaron solas (post-update
      // del pipeline, status='auto_sent'). Para el dashboard el mejor signal
      // está en suggestions, lo unimos abajo.
    }
    if (r.semaphore === "red") totals.escalated += 1;
  }
  // Suggestions del período.
  const { data: sugRows } = await sb
    .from("textos_suggestions")
    .select("id, status, semaphore")
    .eq("org_id", orgId)
    .gte("created_at", since);
  for (const s of sugRows ?? []) {
    totals.suggestions += 1;
    if (s.status === "auto_sent") totals.autosent += 1;
    if (s.status === "pending") totals.pending += 1;
  }

  const rates = {
    autopilot: totals.suggestions ? totals.autosent / totals.suggestions : 0,
    escalation: totals.suggestions ? totals.escalated / totals.suggestions : 0,
    failure: totals.runs ? failed / totals.runs : 0,
  };

  // ---- Latencias (p50, p95) por tipo + total ----
  const latencyByKind: Record<string, number[]> = {
    embed: [],
    classify: [],
    retrieve: [],
    generate: [],
    ground: [],
  };
  for (const t of traces ?? []) {
    if (t.latency_ms == null) continue;
    if (latencyByKind[t.kind]) latencyByKind[t.kind].push(t.latency_ms);
  }
  // Total = end_to_end por run (ended_at - started_at).
  const totalDurations: number[] = [];
  for (const r of runs ?? []) {
    if (!r.ended_at) continue;
    const d = new Date(r.ended_at).getTime() - new Date(r.started_at).getTime();
    if (d > 0) totalDurations.push(d);
  }

  const latency = {
    embed: percentiles(latencyByKind.embed),
    classify: percentiles(latencyByKind.classify),
    retrieve: percentiles(latencyByKind.retrieve),
    generate: percentiles(latencyByKind.generate),
    ground: percentiles(latencyByKind.ground),
    total: percentiles(totalDurations),
  };

  // ---- Costo USD ----
  let totalUsd = 0;
  const byKind: Record<string, number> = {};
  for (const t of traces ?? []) {
    const c = Number(t.cost_usd ?? 0);
    totalUsd += c;
    byKind[t.kind] = (byKind[t.kind] ?? 0) + c;
  }

  // ---- Salud de cada provider ----
  const callsByProvider: Record<string, { calls: number; errors: number }> = {};
  for (const t of traces ?? []) {
    if (!t.provider_id) continue;
    const slot = (callsByProvider[t.provider_id] ??= { calls: 0, errors: 0 });
    slot.calls += 1;
    if (t.error) slot.errors += 1;
  }
  const providerHealth = (providers ?? []).map((p) => {
    const stats = callsByProvider[p.id] ?? { calls: 0, errors: 0 };
    const errorRate = stats.calls ? stats.errors / stats.calls : 0;
    const health: "ok" | "warn" | "down" =
      p.last_test_ok === false || errorRate > 0.5
        ? "down"
        : errorRate > 0.1
          ? "warn"
          : "ok";
    return {
      ...p,
      recent_calls: stats.calls,
      recent_errors: stats.errors,
      health,
      last_test_error: p.last_test_error
        ? humanizeProviderError(p.last_test_error).message
        : null,
    };
  });

  // ---- Knowledge stats ----
  const knowledge = {
    total: kStats?.length ?? 0,
    fresh: 0,
    stale_or_failed: 0,
  };
  for (const k of kStats ?? []) {
    if (k.embedding_state === "fresh") knowledge.fresh += 1;
    else if (k.embedding_state === "stale" || k.embedding_state === "failed")
      knowledge.stale_or_failed += 1;
  }

  // ---- Recent autosends ----
  type AutosendRow = {
    id: string;
    proposed_text: string | null;
    created_at: string;
    confidence: number;
    textos_conversations: { textos_contacts: { name: string } } | null;
  };
  const recentAutosends = ((autosends ?? []) as unknown as AutosendRow[]).map((a) => ({
    id: a.id,
    proposed_text: a.proposed_text ?? "",
    created_at: a.created_at,
    contact_name: a.textos_conversations?.textos_contacts?.name ?? "Cliente",
    confidence: a.confidence,
  }));

  return {
    rangeDays: days,
    totals,
    rates,
    latency,
    cost: { totalUsd: Number(totalUsd.toFixed(4)), byKind },
    providers: providerHealth,
    topCards: cards ?? [],
    recentAutosends,
    knowledge,
  };
}

function percentiles(arr: number[]): { p50: number; p95: number; samples: number } {
  if (arr.length === 0) return { p50: 0, p95: 0, samples: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const pick = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return { p50: pick(0.5), p95: pick(0.95), samples: arr.length };
}

// ---------------------------------------------------------------------------
// Grounding por sugerencia: devuelve las cards usadas para chips clickables.
// ---------------------------------------------------------------------------

export type SuggestionGrounding = {
  cards: Array<{
    id: string;
    topic: string;
    question: string;
    answer: string;
    usage_count: number;
  }>;
  factors: Record<string, unknown> | null;
  reason: string | null;
};

export async function getSuggestionGrounding(suggestionId: string): Promise<SuggestionGrounding> {
  const orgId = await requireOrgId();
  const sb = await createSbServer();

  const { data: run } = await sb
    .from("textos_ai_runs")
    .select("factors, reason")
    .eq("suggestion_id", suggestionId)
    .eq("org_id", orgId)
    .maybeSingle();

  const factors = (run?.factors as Record<string, unknown> | null) ?? null;
  const retrieval = (factors?.retrieval as { cardIds?: string[] } | undefined) ?? undefined;
  const cardIds = retrieval?.cardIds ?? [];

  if (cardIds.length === 0) {
    return { cards: [], factors, reason: run?.reason ?? null };
  }

  const { data: cards } = await sb
    .from("textos_knowledge_cards")
    .select("id, topic, question, answer, usage_count")
    .eq("org_id", orgId)
    .in("id", cardIds);

  // Mantener el orden del retrieval (cards más relevantes primero).
  const orderMap = new Map(cardIds.map((id, i) => [id, i]));
  const ordered = (cards ?? []).sort(
    (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999),
  );

  return { cards: ordered, factors, reason: run?.reason ?? null };
}
