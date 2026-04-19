// Helpers para escribir trazas y manejar el rate limit por org.
// Toda inferencia (embed, classify, generate, ground) deja una fila acá
// con costo y latencia para el dashboard de salud y la auditoría.

import { createSbService } from "@/lib/channels/service";
import type { ProviderRow, RunCtx } from "./types";

type TraceKind = "embed" | "classify" | "generate" | "ground" | "retrieve" | "rerank";

export async function recordTrace(args: {
  ctx: RunCtx;
  kind: TraceKind;
  provider?: ProviderRow | null;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  error?: string | null;
}): Promise<void> {
  const sb = createSbService();
  await sb.from("textos_ai_traces").insert({
    org_id: args.ctx.orgId,
    run_id: args.ctx.runId,
    suggestion_id: args.ctx.suggestionId,
    kind: args.kind,
    provider_id: args.provider?.id ?? null,
    provider: args.provider?.provider ?? null,
    model: args.provider?.model ?? null,
    latency_ms: args.latencyMs,
    input_tokens: args.inputTokens ?? null,
    output_tokens: args.outputTokens ?? null,
    cost_usd: args.costUsd ?? 0,
    error: args.error ? args.error.slice(0, 400) : null,
  });
}

const RATE_WINDOW_SECONDS = 60;
const RATE_MAX_PER_WINDOW = 30; // por org. Conservador; suficiente para 1k convs/mes.

/** Devuelve true si la invocación cabe en el budget; false si tirar bandera roja. */
export async function checkAndIncrementRate(orgId: string): Promise<boolean> {
  const sb = createSbService();
  const now = new Date();
  const cutoff = new Date(now.getTime() - RATE_WINDOW_SECONDS * 1000);

  // Leer estado actual.
  const { data: state } = await sb
    .from("textos_ai_rate_state")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!state || new Date(state.window_started_at) < cutoff) {
    // Reset / primera vez en la ventana.
    await sb.from("textos_ai_rate_state").upsert({
      org_id: orgId,
      window_started_at: now.toISOString(),
      count: 1,
      updated_at: now.toISOString(),
    });
    return true;
  }

  if (state.count >= RATE_MAX_PER_WINDOW) {
    return false;
  }

  await sb
    .from("textos_ai_rate_state")
    .update({ count: state.count + 1, updated_at: now.toISOString() })
    .eq("org_id", orgId);
  return true;
}
