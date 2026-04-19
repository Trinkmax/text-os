// Recuperación híbrida: vector + trigrama via función SQL textos_match_knowledge.
// Filtramos por org_id en el WHERE de la RPC (no después) — invariante de
// aislamiento multi-tenant.

import { createSbService } from "@/lib/channels/service";
import { recordTrace } from "./trace";
import { embedQuery } from "./embeddings";
import { getActiveProviderRow } from "./providers";
import type { RetrievedChunk, RunCtx } from "./types";

export type RetrievalOutcome = {
  chunks: RetrievedChunk[];
  /** True si pudimos vectorizar la query (sin esto, sólo léxico). */
  hasVector: boolean;
};

export async function retrieveContext(
  orgId: string,
  queryText: string,
  ctx: RunCtx,
  topK = 5,
): Promise<RetrievalOutcome> {
  const sb = createSbService();
  const started = Date.now();

  // 1. Vectorizamos la query si hay provider de embeddings.
  let vector: number[] | null = null;
  const embedProvider = await getActiveProviderRow(orgId, "embedding");
  if (embedProvider) {
    const r = await embedQuery(queryText, embedProvider, ctx);
    vector = r?.vector ?? null;
  }

  // 2. Llamamos a la función PG. Si no hay vector, pasamos null y la función
  //    se queda con el componente trigrama.
  // supabase-js requiere pasar el vector como string del estilo "[0.1,0.2,...]".
  const pVec = vector ? `[${vector.join(",")}]` : null;

  // RPC no está en el typegen mínimo — castamos la firma del cliente.
  const rpc = (sb.rpc as unknown as (
    fn: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>);
  const { data, error } = await rpc("textos_match_knowledge", {
    p_org_id: orgId,
    p_embedding: pVec,
    p_query_text: queryText,
    p_limit: topK,
  });

  await recordTrace({
    ctx,
    kind: "retrieve",
    latencyMs: Date.now() - started,
    error: error?.message ?? null,
  });

  if (error || !Array.isArray(data)) {
    return { chunks: [], hasVector: !!vector };
  }
  return { chunks: data as RetrievedChunk[], hasVector: !!vector };
}
