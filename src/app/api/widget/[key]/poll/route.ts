import { NextResponse, type NextRequest } from "next/server";
import { createSbService } from "@/lib/channels/service";

// Devuelve los mensajes del operador al visitante desde `since`. No exponemos
// mensajes de otros visitantes — los filtramos por el `session` id del contacto.

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const session = request.nextUrl.searchParams.get("session");
  const since = request.nextUrl.searchParams.get("since");
  if (!session) return corsJson({ error: "bad request" }, 400);

  const sb = createSbService();
  const { data: channel } = await sb
    .from("textos_channels")
    .select("id, org_id, status")
    .eq("type", "webchat")
    .filter("config->>widget_key", "eq", key)
    .single();
  if (!channel || channel.status !== "connected") {
    return corsJson({ messages: [] });
  }

  // Resolvemos contact del visitante por (org, channel=webchat, external_id=session).
  const { data: contact } = await sb
    .from("textos_contacts")
    .select("id")
    .eq("org_id", channel.org_id)
    .eq("channel", "webchat")
    .eq("external_id", session)
    .maybeSingle();
  if (!contact) return corsJson({ messages: [] });

  // Buscamos la conversación abierta del contacto por este channel_id.
  const { data: conv } = await sb
    .from("textos_conversations")
    .select("id")
    .eq("org_id", channel.org_id)
    .eq("contact_id", contact.id)
    .eq("channel_id", channel.id)
    .maybeSingle();
  if (!conv) return corsJson({ messages: [] });

  let q = sb
    .from("textos_messages")
    .select("id, direction, body, created_at")
    .eq("conversation_id", conv.id)
    .eq("direction", "out")
    .order("created_at", { ascending: true })
    .limit(50);
  if (since) q = q.gt("created_at", since);

  const { data } = await q;
  return corsJson({ messages: data ?? [] });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
  } as Record<string, string>;
}

function corsJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { ...corsHeaders(), "cache-control": "no-store" },
  });
}
