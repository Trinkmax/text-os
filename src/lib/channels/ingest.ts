import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createSbService } from "./service";

type Sb = SupabaseClient<Database>;

export type InboundEvent = {
  orgId: string;
  channelId: string;
  /** Canal lógico (whatsapp | instagram | messenger | webchat | email). */
  channelType: "whatsapp" | "instagram" | "messenger" | "webchat" | "email";
  /** Identificador estable del contacto en el canal (phone, PSID, session id, email). */
  externalContactId: string;
  /** Nombre visible si el proveedor lo da; si no, null y usamos un fallback. */
  contactName?: string | null;
  /** Avatar si el proveedor lo provee. */
  contactAvatarUrl?: string | null;
  /** Cuerpo de texto del mensaje (stickers / adjuntos van por attachments). */
  body: string;
  /** Id del mensaje en el proveedor — garantiza que no se dobla al reintentar. */
  externalMessageId: string;
  /** Momento del evento (ISO). Si falta, usamos now(). */
  createdAt?: string | null;
};

export type IngestResult =
  | { ok: true; conversationId: string; messageId: string; deduplicated: boolean }
  | { ok: false; error: string };

/**
 * Ingresa un mensaje entrante al buzón de la org de forma idempotente.
 * Si el proveedor reintenta el webhook, el unique index por (conversation_id,
 * external_id) bloquea el duplicado y devolvemos `deduplicated: true`.
 */
export async function ingestInboundMessage(evt: InboundEvent): Promise<IngestResult> {
  const sb = createSbService();
  try {
    const contact = await upsertContact(sb, evt);
    if (!contact) return { ok: false, error: "No se pudo upsertear el contacto" };

    const conversation = await upsertConversation(sb, evt, contact.id);
    if (!conversation) return { ok: false, error: "No se pudo crear la conversación" };

    const inserted = await insertMessage(sb, evt, conversation.id);
    if (!inserted.ok) return inserted;

    await touchConversation(sb, conversation.id, evt);

    return {
      ok: true,
      conversationId: conversation.id,
      messageId: inserted.messageId,
      deduplicated: inserted.deduplicated,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function upsertContact(sb: Sb, evt: InboundEvent) {
  // Buscamos por (org, channel, external_id) — unique index garantiza 1 fila.
  const { data: existing } = await sb
    .from("textos_contacts")
    .select("id")
    .eq("org_id", evt.orgId)
    .eq("channel", evt.channelType)
    .eq("external_id", evt.externalContactId)
    .maybeSingle();
  if (existing) return existing;

  const name = (evt.contactName ?? "").trim() || fallbackName(evt);
  const { data: created } = await sb
    .from("textos_contacts")
    .insert({
      org_id: evt.orgId,
      name,
      avatar_url: evt.contactAvatarUrl ?? null,
      channel: evt.channelType,
      external_id: evt.externalContactId,
      phone: evt.channelType === "whatsapp" ? evt.externalContactId : null,
      email: evt.channelType === "email" ? evt.externalContactId : null,
      source: evt.channelType,
      last_interaction_at: evt.createdAt ?? new Date().toISOString(),
    })
    .select("id")
    .single();
  return created;
}

async function upsertConversation(sb: Sb, evt: InboundEvent, contactId: string) {
  // Una conversación abierta por contacto+canal. Si no hay, se crea.
  const { data: existing } = await sb
    .from("textos_conversations")
    .select("id")
    .eq("org_id", evt.orgId)
    .eq("contact_id", contactId)
    .eq("channel_id", evt.channelId)
    .in("status", ["open", "snoozed"])
    .maybeSingle();
  if (existing) return existing;

  const { data: created } = await sb
    .from("textos_conversations")
    .insert({
      org_id: evt.orgId,
      contact_id: contactId,
      channel: evt.channelType,
      channel_id: evt.channelId,
      status: "open",
      semaphore: "amber",
      ai_mode: "suggest",
      last_message: evt.body,
      last_message_at: evt.createdAt ?? new Date().toISOString(),
      unread_count: 1,
    })
    .select("id")
    .single();
  return created;
}

async function insertMessage(sb: Sb, evt: InboundEvent, conversationId: string) {
  const { data, error } = await sb
    .from("textos_messages")
    .insert({
      conversation_id: conversationId,
      org_id: evt.orgId,
      channel_id: evt.channelId,
      direction: "in",
      author: "contact",
      body: evt.body,
      external_id: evt.externalMessageId,
      created_at: evt.createdAt ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (!error && data) {
    return { ok: true as const, messageId: data.id, deduplicated: false };
  }
  // Unique violation → ya había entrado, devolvemos el id existente.
  if (error && error.code === "23505") {
    const { data: dup } = await sb
      .from("textos_messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("external_id", evt.externalMessageId)
      .single();
    return { ok: true as const, messageId: dup?.id ?? "", deduplicated: true };
  }
  return { ok: false as const, error: error?.message ?? "insert failed" };
}

async function touchConversation(sb: Sb, conversationId: string, evt: InboundEvent) {
  // RPC sería ideal para sumar unread_count atómico, pero acá lo resolvemos con
  // un select+update bajo el mismo request. Colisiones realistas son raras.
  const { data } = await sb
    .from("textos_conversations")
    .select("unread_count")
    .eq("id", conversationId)
    .single();
  const next = (data?.unread_count ?? 0) + 1;
  await sb
    .from("textos_conversations")
    .update({
      last_message: evt.body,
      last_message_at: evt.createdAt ?? new Date().toISOString(),
      unread_count: next,
      status: "open",
    })
    .eq("id", conversationId);
}

function fallbackName(evt: InboundEvent) {
  if (evt.channelType === "whatsapp") return `WA ${evt.externalContactId.slice(-4)}`;
  if (evt.channelType === "email") return evt.externalContactId;
  if (evt.channelType === "webchat") return `Visitante ${evt.externalContactId.slice(0, 4)}`;
  return `Contacto ${evt.externalContactId.slice(0, 6)}`;
}
