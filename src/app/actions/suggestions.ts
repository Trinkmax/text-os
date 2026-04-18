"use server";

import { revalidatePath } from "next/cache";
import { createSbServer } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";

export type SwipeAction = "send" | "dismiss" | "escalate" | "snooze" | "learn";

export async function resolveSuggestion(params: {
  suggestionId: string;
  action: SwipeAction;
  editedText?: string;
  learnAsCard?: boolean;
}) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org");
  const sb = await createSbServer();

  const { data: sug } = await sb
    .from("textos_suggestions")
    .select("*, textos_conversations!inner(*)")
    .eq("id", params.suggestionId)
    .single();
  if (!sug) throw new Error("Sugerencia no encontrada");

  const finalText = params.editedText?.trim() || sug.proposed_text || "";

  if (params.action === "send" || params.action === "learn") {
    if (finalText) {
      await sb.from("textos_messages").insert({
        org_id: orgId,
        conversation_id: sug.conversation_id,
        direction: "out",
        author: "human",
        body: finalText,
      });
      await sb
        .from("textos_conversations")
        .update({
          last_message: finalText,
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        })
        .eq("id", sug.conversation_id);
    }
    if (params.action === "learn" && params.learnAsCard) {
      // Use the inbound message as the question, the sent text as the answer
      const { data: lastIn } = await sb
        .from("textos_messages")
        .select("body")
        .eq("conversation_id", sug.conversation_id)
        .eq("direction", "in")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (lastIn?.body) {
        await sb.from("textos_knowledge_cards").insert({
          org_id: orgId,
          topic: "Aprendida del operador",
          question: lastIn.body,
          answer: finalText,
          variants: [],
          origin: "learned",
          confidence: 0.7,
        });
      }
    }
    await sb
      .from("textos_suggestions")
      .update({
        status: params.action === "learn" ? "scope_gap_learned" : "sent",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", params.suggestionId);
  } else if (params.action === "dismiss") {
    await sb
      .from("textos_suggestions")
      .update({ status: "dismissed", resolved_at: new Date().toISOString() })
      .eq("id", params.suggestionId);
  } else if (params.action === "escalate") {
    await sb
      .from("textos_suggestions")
      .update({ status: "escalated", resolved_at: new Date().toISOString() })
      .eq("id", params.suggestionId);
    await sb.from("textos_conversations").update({ semaphore: "red" }).eq("id", sug.conversation_id);
  } else if (params.action === "snooze") {
    await sb
      .from("textos_suggestions")
      .update({
        status: "snoozed",
        snooze_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", params.suggestionId);
  }

  revalidatePath("/swipe");
  revalidatePath("/conversaciones");
  revalidatePath("/inicio");
  return { ok: true };
}

export async function undoResolution(suggestionId: string) {
  const sb = await createSbServer();
  await sb
    .from("textos_suggestions")
    .update({ status: "pending", resolved_at: null, snooze_until: null })
    .eq("id", suggestionId);
  revalidatePath("/swipe");
  return { ok: true };
}

export async function flagAutosend(suggestionId: string, note?: string) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org");
  const sb = await createSbServer();
  await sb.from("textos_autosend_feedback").insert({
    org_id: orgId,
    suggestion_id: suggestionId,
    feedback: "bad",
    note: note || null,
  });
  revalidatePath("/swipe");
  return { ok: true };
}
