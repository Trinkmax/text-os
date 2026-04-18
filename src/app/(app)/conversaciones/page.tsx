import { redirect } from "next/navigation";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { ConversationsView } from "@/components/conversations/conversations-view";

export const dynamic = "force-dynamic";

export default async function ConversacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();
  const sp = await searchParams;

  const { data: convs } = await sb
    .from("textos_conversations")
    .select(
      "id,channel,last_message,last_message_at,unread_count,semaphore,ai_mode,status,contact_id,textos_contacts!inner(id,name,avatar_url,stage,tags,phone,email,value,last_interaction_at,source)"
    )
    .eq("org_id", orgId)
    .order("last_message_at", { ascending: false })
    .limit(80);

  const initialId = sp.open || convs?.[0]?.id || null;

  let messages: { id: string; body: string; direction: "in" | "out"; author: string; created_at: string }[] = [];
  let current = null;
  if (initialId) {
    const { data: msg } = await sb
      .from("textos_messages")
      .select("id,body,direction,author,created_at")
      .eq("conversation_id", initialId)
      .order("created_at", { ascending: true });
    messages = (msg as never) || [];
    current = convs?.find((c) => c.id === initialId) || null;
  }

  return (
    <ConversationsView
      orgId={orgId}
      initialConversations={(convs || []).map((c) => ({
        id: c.id,
        channel: c.channel,
        lastMessage: c.last_message,
        lastMessageAt: c.last_message_at,
        unread: c.unread_count,
        semaphore: c.semaphore as never,
        aiMode: c.ai_mode as never,
        contact: (c as unknown as { textos_contacts: never }).textos_contacts,
      }))}
      initialSelectedId={initialId}
      initialMessages={messages}
      initialSelected={current ? ({ id: current.id } as never) : null}
    />
  );
}
