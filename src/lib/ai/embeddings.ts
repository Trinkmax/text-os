// Capa de embeddings: chunking, padding, indexado de cards.
// Una card = un chunk por ahora (cards son atómicas en este producto).
// El padding/truncate se hace contra `EMBED_DIM` para que la columna
// vector(1536) acepte cualquier modelo; el coseno se mantiene válido.

import { embed } from "ai";
import { createSbService } from "@/lib/channels/service";
import type { Row } from "@/lib/supabase/types";
import { resolveEmbeddingModel } from "./providers";
import { computeCost, estimateTokens } from "./pricing";
import { recordTrace } from "./trace";
import type { ProviderRow, RunCtx } from "./types";

export const EMBED_DIM = 1536;

type CardRow = Row<"textos_knowledge_cards">;

/** Texto canónico de un chunk para una card: incluye topic + Q + variantes + A.
 *  Lo mantenemos plano para que el trigrama (gin_trgm_ops) lo indexe completo. */
export function chunkTextForCard(card: Pick<CardRow, "topic" | "question" | "answer" | "variants">): string {
  const variants = (card.variants ?? []).filter(Boolean);
  const variantLine = variants.length ? `\nFormas de preguntar: ${variants.join(" | ")}` : "";
  return `Tema: ${card.topic}\nPregunta: ${card.question}${variantLine}\nRespuesta: ${card.answer}`.trim();
}

/** Adapta el vector retornado por el proveedor a EMBED_DIM. */
export function padOrTrim(vec: number[]): number[] {
  if (vec.length === EMBED_DIM) return vec;
  if (vec.length > EMBED_DIM) return vec.slice(0, EMBED_DIM);
  const out = new Array(EMBED_DIM).fill(0);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i];
  return out;
}

/** Embed de una query (mensaje del cliente). Devuelve null si no hay provider. */
export async function embedQuery(
  text: string,
  provider: ProviderRow,
  ctx: RunCtx,
): Promise<{ vector: number[]; provider: ProviderRow } | null> {
  const started = Date.now();
  try {
    const model = resolveEmbeddingModel(provider);
    const { embedding, usage } = await embed({ model, value: text });
    const latencyMs = Date.now() - started;
    const vec = padOrTrim(embedding as number[]);
    const inputTokens = usage?.tokens ?? estimateTokens(text);
    await recordTrace({
      ctx,
      kind: "embed",
      provider,
      latencyMs,
      inputTokens,
      costUsd: computeCost(provider, { inputTokens }),
    });
    return { vector: vec, provider };
  } catch (err) {
    await recordTrace({
      ctx,
      kind: "embed",
      provider,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Indexa una card individual: embed + upsert chunk. Idempotente: borra
 *  los chunks viejos de la card y reescribe. Marca state en la card. */
export async function indexCard(
  cardId: string,
  orgId: string,
  provider: ProviderRow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = createSbService();
  const { data: card } = await sb
    .from("textos_knowledge_cards")
    .select("id,topic,question,answer,variants")
    .eq("id", cardId)
    .eq("org_id", orgId)
    .single();
  if (!card) return { ok: false, error: "Card no encontrada" };

  // Marcar como indexing.
  await sb
    .from("textos_knowledge_cards")
    .update({ embedding_state: "indexing", embedding_error: null })
    .eq("id", cardId)
    .eq("org_id", orgId);

  const text = chunkTextForCard(card);
  const ctx: RunCtx = { orgId, runId: cardId, suggestionId: null };
  const result = await embedQuery(text, provider, ctx);
  if (!result) {
    await sb
      .from("textos_knowledge_cards")
      .update({ embedding_state: "failed", embedding_error: "embed falló" })
      .eq("id", cardId)
      .eq("org_id", orgId);
    return { ok: false, error: "embed falló" };
  }

  // Borrar chunks viejos y crear el nuevo.
  await sb.from("textos_kcard_chunks").delete().eq("card_id", cardId).eq("org_id", orgId);
  const { error: insErr } = await sb.from("textos_kcard_chunks").insert({
    org_id: orgId,
    card_id: cardId,
    chunk_idx: 0,
    text,
    embedding: result.vector as unknown as number[],
    dim: EMBED_DIM,
    token_count: estimateTokens(text),
  });
  if (insErr) {
    await sb
      .from("textos_knowledge_cards")
      .update({ embedding_state: "failed", embedding_error: insErr.message.slice(0, 300) })
      .eq("id", cardId)
      .eq("org_id", orgId);
    return { ok: false, error: insErr.message };
  }

  await sb
    .from("textos_knowledge_cards")
    .update({
      embedding_state: "fresh",
      embedding_model: provider.model,
      embedding_provider_id: provider.id,
      embedding_dim: EMBED_DIM,
      embedding_updated_at: new Date().toISOString(),
      embedding_error: null,
    })
    .eq("id", cardId)
    .eq("org_id", orgId);

  return { ok: true };
}

/** Re-indexa todas las cards stale/no_provider de una org en serie.
 *  Devuelve contadores para mostrar progreso. No hace failover entre
 *  providers — usa el que se pase. */
export async function indexStaleCards(
  orgId: string,
  provider: ProviderRow,
  opts: { limit?: number } = {},
): Promise<{ indexed: number; failed: number }> {
  const sb = createSbService();
  const { data: stale } = await sb
    .from("textos_knowledge_cards")
    .select("id")
    .eq("org_id", orgId)
    .in("embedding_state", ["stale", "no_provider", "failed"])
    .order("usage_count", { ascending: false })
    .limit(opts.limit ?? 200);

  let indexed = 0;
  let failed = 0;
  for (const c of stale ?? []) {
    const r = await indexCard(c.id, orgId, provider);
    if (r.ok) indexed++;
    else failed++;
  }
  return { indexed, failed };
}

/** Cuando se desconecta el último embedding provider, marcamos todas las
 *  cards como `no_provider` para que la UI muestre el empty state correcto. */
export async function markAllCardsNoProvider(orgId: string): Promise<void> {
  const sb = createSbService();
  await sb
    .from("textos_knowledge_cards")
    .update({ embedding_state: "no_provider", embedding_error: null })
    .eq("org_id", orgId);
}
