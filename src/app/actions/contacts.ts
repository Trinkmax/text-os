"use server";

import { revalidatePath } from "next/cache";
import { createSbServer } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";

export async function createContact(input: {
  name: string;
  phone?: string;
  email?: string;
  channel?: string;
  stage?: string;
  tags?: string[];
}) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org");
  const sb = await createSbServer();
  const { data } = await sb
    .from("textos_contacts")
    .insert({
      org_id: orgId,
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      channel: input.channel || null,
      stage: input.stage || "Nuevo lead",
      tags: input.tags || [],
    })
    .select("id")
    .single();
  revalidatePath("/contactos");
  return { ok: true, id: data?.id };
}

export async function updateContactStage(contactId: string, stage: string) {
  const sb = await createSbServer();
  await sb.from("textos_contacts").update({ stage }).eq("id", contactId);
  revalidatePath("/contactos");
  return { ok: true };
}

export async function updateContactTags(contactId: string, tags: string[]) {
  const sb = await createSbServer();
  await sb.from("textos_contacts").update({ tags }).eq("id", contactId);
  revalidatePath("/contactos");
  return { ok: true };
}

export async function sendMessage(input: { conversationId: string; body: string }) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org");
  const sb = await createSbServer();
  await sb.from("textos_messages").insert({
    org_id: orgId,
    conversation_id: input.conversationId,
    direction: "out",
    author: "human",
    body: input.body,
  });
  await sb
    .from("textos_conversations")
    .update({
      last_message: input.body,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    })
    .eq("id", input.conversationId);
  revalidatePath("/conversaciones");
  return { ok: true };
}

export async function setConversationAiMode(conversationId: string, ai_mode: "auto" | "suggest" | "off") {
  const sb = await createSbServer();
  await sb.from("textos_conversations").update({ ai_mode }).eq("id", conversationId);
  revalidatePath("/conversaciones");
  return { ok: true };
}
