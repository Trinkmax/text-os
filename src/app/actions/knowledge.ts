"use server";

import { revalidatePath } from "next/cache";
import { createSbServer } from "@/lib/supabase/server";
import { requireOrgId } from "@/lib/org";

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
  } else {
    const { error } = await sb.from("textos_knowledge_cards").insert({
      org_id: orgId,
      topic: input.topic,
      question: input.question,
      answer: input.answer,
      variants: input.variants || [],
      confidence: input.confidence ?? 0.7,
      origin: "manual",
    });
    if (error) return { ok: false, error: error.message };
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
  }
  revalidatePath("/conocimiento");
  return { ok: true };
}
