"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createSbServer } from "@/lib/supabase/server";
import { requireOrgId } from "@/lib/org";
import { sendMessageViaChannel } from "@/lib/channels/send";

export type SwipeAction = "send" | "dismiss" | "escalate" | "snooze" | "learn";

export async function resolveSuggestion(params: {
  suggestionId: string;
  action: SwipeAction;
  editedText?: string;
  learnAsCard?: boolean;
}) {
  const orgId = await requireOrgId();
  const sb = await createSbServer();

  const { data: sug } = await sb
    .from("textos_suggestions")
    .select("*, textos_conversations!inner(*)")
    .eq("id", params.suggestionId)
    .eq("org_id", orgId)
    .single();
  if (!sug) return { ok: false, error: "Sugerencia no encontrada" };

  const finalText = params.editedText?.trim() || sug.proposed_text || "";

  if (params.action === "send" || params.action === "learn") {
    if (finalText) {
      // Traemos canal + contacto para poder dispatchar al proveedor externo.
      const { data: conv } = await sb
        .from("textos_conversations")
        .select("id, channel_id, contact_id")
        .eq("id", sug.conversation_id)
        .eq("org_id", orgId)
        .single();

      let contactExternalId: string | null = null;
      if (conv?.contact_id) {
        const { data: contact } = await sb
          .from("textos_contacts")
          .select("external_id")
          .eq("id", conv.contact_id)
          .eq("org_id", orgId)
          .single();
        contactExternalId = contact?.external_id ?? null;
      }

      const { data: inserted } = await sb
        .from("textos_messages")
        .insert({
          org_id: orgId,
          conversation_id: sug.conversation_id,
          channel_id: conv?.channel_id ?? null,
          direction: "out",
          author: "human",
          body: finalText,
          delivery_status: conv?.channel_id ? "queued" : null,
        })
        .select("id")
        .single();

      await sb
        .from("textos_conversations")
        .update({
          last_message: finalText,
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        })
        .eq("id", sug.conversation_id)
        .eq("org_id", orgId);

      // Dispatch asincrónico al proveedor: no bloqueamos la respuesta al
      // operador. Si falla, queda marcado en `delivery_status = 'failed'`
      // con el error en `delivery_error`.
      if (inserted?.id && conv?.channel_id && contactExternalId) {
        after(async () => {
          await sendMessageViaChannel({
            channelId: conv.channel_id!,
            toExternalId: contactExternalId!,
            body: finalText,
            messageId: inserted.id,
          });
        });
      }
    }
    if (params.action === "learn" && params.learnAsCard) {
      const { data: lastIn } = await sb
        .from("textos_messages")
        .select("body")
        .eq("conversation_id", sug.conversation_id)
        .eq("org_id", orgId)
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
      .eq("id", params.suggestionId)
      .eq("org_id", orgId);
  } else if (params.action === "dismiss") {
    await sb
      .from("textos_suggestions")
      .update({ status: "dismissed", resolved_at: new Date().toISOString() })
      .eq("id", params.suggestionId)
      .eq("org_id", orgId);
  } else if (params.action === "escalate") {
    await sb
      .from("textos_suggestions")
      .update({ status: "escalated", resolved_at: new Date().toISOString() })
      .eq("id", params.suggestionId)
      .eq("org_id", orgId);
    await sb
      .from("textos_conversations")
      .update({ semaphore: "red" })
      .eq("id", sug.conversation_id)
      .eq("org_id", orgId);
  } else if (params.action === "snooze") {
    await sb
      .from("textos_suggestions")
      .update({
        status: "snoozed",
        snooze_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", params.suggestionId)
      .eq("org_id", orgId);
  }

  revalidatePath("/swipe");
  revalidatePath("/conversaciones");
  revalidatePath("/inicio");
  return { ok: true };
}

export async function undoResolution(suggestionId: string) {
  const orgId = await requireOrgId();
  const sb = await createSbServer();
  await sb
    .from("textos_suggestions")
    .update({ status: "pending", resolved_at: null, snooze_until: null })
    .eq("id", suggestionId)
    .eq("org_id", orgId);
  revalidatePath("/swipe");
  return { ok: true };
}

export async function flagAutosend(suggestionId: string, note?: string) {
  const orgId = await requireOrgId();
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
