"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createSbServer } from "@/lib/supabase/server";
import { requireOrgId } from "@/lib/org";
import { getActiveProviderRow } from "@/lib/ai/providers";
import { indexCard, indexStaleCards, markAllCardsNoProvider } from "@/lib/ai/embeddings";

export async function saveKnowledgeCard(input: {
  id?: string;
  topic: string;
  question: string;
  answer: string;
  variants?: string[];
  confidence?: number;
}) {
  const orgId = await requireOrgId();
  const sb = await createSbServer();

  let cardId: string | null = null;
  if (input.id) {
    const { error } = await sb
      .from("textos_knowledge_cards")
      .update({
        topic: input.topic,
        question: input.question,
        answer: input.answer,
        variants: input.variants || [],
        confidence: input.confidence ?? undefined,
      })
      .eq("id", input.id)
      .eq("org_id", orgId);
    if (error) return { ok: false, error: error.message };
    cardId = input.id;
  } else {
    const { data: created, error } = await sb
      .from("textos_knowledge_cards")
      .insert({
        org_id: orgId,
        topic: input.topic,
        question: input.question,
        answer: input.answer,
        variants: input.variants || [],
        confidence: input.confidence ?? 0.7,
        origin: "manual",
      })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: error?.message ?? "no_id" };
    cardId = created.id;
  }

  // Re-indexar la card en background si hay provider de embeddings.
  if (cardId) {
    after(async () => {
      const provider = await getActiveProviderRow(orgId, "embedding");
      if (!provider) return; // Quedará marcada como stale; al conectar provider se indexa.
      try {
        await indexCard(cardId, orgId, provider);
      } catch {
        // El indexCard ya escribe state='failed' con error.
      }
    });
  }

  revalidatePath("/conocimiento");
  return { ok: true };
}

export async function deleteKnowledgeCard(id: string) {
  const orgId = await requireOrgId();
  const sb = await createSbServer();
  const { error } = await sb
    .from("textos_knowledge_cards")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/conocimiento");
  return { ok: true };
}

export async function convertScopeGap(gapId: string, answer: string) {
  const orgId = await requireOrgId();
  const sb = await createSbServer();
  const { data: gap } = await sb
    .from("textos_scope_gaps")
    .select("*")
    .eq("id", gapId)
    .eq("org_id", orgId)
    .single();
  if (!gap) return { ok: false, error: "Gap no encontrado" };

  const { data: card, error: cardError } = await sb
    .from("textos_knowledge_cards")
    .insert({
      org_id: orgId,
      topic: gap.topic,
      question: gap.sample_question || gap.topic,
      answer,
      origin: "learned",
      confidence: 0.7,
    })
    .select("id")
    .single();
  if (cardError) return { ok: false, error: cardError.message };

  if (card) {
    await sb
      .from("textos_scope_gaps")
      .update({ resolved_card_id: card.id })
      .eq("id", gapId)
      .eq("org_id", orgId);
    // Indexar la card recién aprendida.
    const cardId = card.id;
    after(async () => {
      const provider = await getActiveProviderRow(orgId, "embedding");
      if (!provider) return;
      try {
        await indexCard(cardId, orgId, provider);
      } catch {
        // best-effort
      }
    });
  }
  revalidatePath("/conocimiento");
  return { ok: true };
}

/** Re-indexa todas las cards (stale + no_provider + failed). Usable como
 *  "indexar todo" desde la UI o como side-effect al conectar el primer
 *  provider de embeddings. */
export async function reindexAllCards(): Promise<{ ok: true; indexed: number; failed: number } | { ok: false; error: string }> {
  const orgId = await requireOrgId();
  const provider = await getActiveProviderRow(orgId, "embedding");
  if (!provider) {
    await markAllCardsNoProvider(orgId);
    return { ok: false, error: "Conectá un modelo de embeddings primero." };
  }
  const result = await indexStaleCards(orgId, provider);
  revalidatePath("/conocimiento");
  return { ok: true, indexed: result.indexed, failed: result.failed };
}

/** Stats de indexación para mostrar arriba en /conocimiento o en /reportes. */
export async function getKnowledgeIndexStatus(): Promise<{
  total: number;
  fresh: number;
  stale: number;
  indexing: number;
  failed: number;
  no_provider: number;
  has_embedding_provider: boolean;
  last_indexed_at: string | null;
}> {
  const orgId = await requireOrgId();
  const sb = await createSbServer();
  const [{ data: cards }, embedProvider] = await Promise.all([
    sb
      .from("textos_knowledge_cards")
      .select("embedding_state, embedding_updated_at")
      .eq("org_id", orgId),
    getActiveProviderRow(orgId, "embedding"),
  ]);
  const counts = { fresh: 0, stale: 0, indexing: 0, failed: 0, no_provider: 0 };
  let lastIndexedAt: string | null = null;
  for (const c of cards ?? []) {
    counts[c.embedding_state as keyof typeof counts] =
      (counts[c.embedding_state as keyof typeof counts] ?? 0) + 1;
    if (c.embedding_updated_at && (!lastIndexedAt || c.embedding_updated_at > lastIndexedAt)) {
      lastIndexedAt = c.embedding_updated_at;
    }
  }
  return {
    total: cards?.length ?? 0,
    ...counts,
    has_embedding_provider: !!embedProvider,
    last_indexed_at: lastIndexedAt,
  };
}
