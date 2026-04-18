"use server";

import { revalidatePath } from "next/cache";
import { createSbServer } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";

export async function saveKnowledgeCard(input: {
  id?: string;
  topic: string;
  question: string;
  answer: string;
  variants?: string[];
  confidence?: number;
}) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org");
  const sb = await createSbServer();
  if (input.id) {
    await sb
      .from("textos_knowledge_cards")
      .update({
        topic: input.topic,
        question: input.question,
        answer: input.answer,
        variants: input.variants || [],
        confidence: input.confidence ?? undefined,
      })
      .eq("id", input.id);
  } else {
    await sb.from("textos_knowledge_cards").insert({
      org_id: orgId,
      topic: input.topic,
      question: input.question,
      answer: input.answer,
      variants: input.variants || [],
      confidence: input.confidence ?? 0.7,
      origin: "manual",
    });
  }
  revalidatePath("/conocimiento");
  return { ok: true };
}

export async function deleteKnowledgeCard(id: string) {
  const sb = await createSbServer();
  await sb.from("textos_knowledge_cards").delete().eq("id", id);
  revalidatePath("/conocimiento");
  return { ok: true };
}

export async function convertScopeGap(gapId: string, answer: string) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org");
  const sb = await createSbServer();
  const { data: gap } = await sb.from("textos_scope_gaps").select("*").eq("id", gapId).single();
  if (!gap) throw new Error("Gap not found");
  const { data: card } = await sb
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
  if (card) {
    await sb.from("textos_scope_gaps").update({ resolved_card_id: card.id }).eq("id", gapId);
  }
  revalidatePath("/conocimiento");
  return { ok: true };
}
