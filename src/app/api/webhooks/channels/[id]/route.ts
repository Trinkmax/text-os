import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { createSbService } from "@/lib/channels/service";
import { ingestInboundMessage, type InboundEvent } from "@/lib/channels/ingest";

// Meta (WhatsApp / Instagram / Messenger) webhook. Este endpoint es público —
// Meta lo llama sin cookies. La autenticación se hace con:
//   - GET: el `verify_token` por canal (handshake inicial).
//   - POST: firma X-Hub-Signature-256 calculada con el `app_secret` del canal.

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return new NextResponse("bad request", { status: 400 });
  }

  const sb = createSbService();
  const { data } = await sb
    .from("textos_channels")
    .select("id, secrets")
    .eq("id", id)
    .single();

  const secrets = (data?.secrets ?? {}) as Record<string, unknown>;
  if (!data || secrets.verify_token !== token) {
    return new NextResponse("forbidden", { status: 403 });
  }

  await sb
    .from("textos_channels")
    .update({ status: "connected", verified_at: new Date().toISOString(), last_error: null })
    .eq("id", id);

  return new NextResponse(challenge, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const raw = await request.text();
  const signatureHeader = request.headers.get("x-hub-signature-256") ?? "";

  const sb = createSbService();
  const { data: channel } = await sb
    .from("textos_channels")
    .select("id, org_id, type, secrets")
    .eq("id", id)
    .single();

  if (!channel) return new NextResponse("not found", { status: 404 });

  const secrets = (channel.secrets ?? {}) as Record<string, unknown>;
  const appSecret = typeof secrets.app_secret === "string" ? secrets.app_secret : null;

  if (!appSecret) {
    // Canal cargado pero sin app_secret aún. Rechazamos para no ingresar
    // datos sin autenticar. El admin tiene que terminar la conexión.
    return new NextResponse("channel not configured", { status: 412 });
  }

  if (!verifyMetaSignature(signatureHeader, raw, appSecret)) {
    await sb
      .from("textos_channels")
      .update({ last_error: "Firma X-Hub-Signature-256 inválida" })
      .eq("id", id);
    return new NextResponse("bad signature", { status: 401 });
  }

  // Parseamos ya aunque el procesamiento sea asíncrono: si el JSON es inválido,
  // respondemos 400 para que Meta no reintente eternamente algo roto.
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("invalid json", { status: 400 });
  }

  const events = parseMetaPayload(
    payload,
    channel.type as "whatsapp" | "instagram" | "messenger",
    channel.id,
    channel.org_id,
  );

  // Respondemos 200 rápido y procesamos la ingesta después del response.
  // Meta considera no-200 como fallo y reintenta por 24h, así que acá sólo
  // validamos y delegamos a `after()` para no bloquear la devolución.
  after(async () => {
    for (const evt of events) {
      await ingestInboundMessage(evt);
    }
  });

  return NextResponse.json({ ok: true, received: events.length });
}

// ---------------------------------------------------------------------------
// Firma
// ---------------------------------------------------------------------------

function verifyMetaSignature(header: string, raw: string, appSecret: string) {
  // Header tiene la forma "sha256=<hex>".
  const prefix = "sha256=";
  if (!header.startsWith(prefix)) return false;
  const expected = header.slice(prefix.length);
  const computed = createHmac("sha256", appSecret).update(raw).digest("hex");
  if (expected.length !== computed.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(computed, "hex"));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Parsers por formato
// ---------------------------------------------------------------------------

type MetaEntry = {
  id?: string;
  changes?: Array<{
    field?: string;
    value?: {
      messages?: Array<{
        from?: string;
        id?: string;
        timestamp?: string;
        type?: string;
        text?: { body?: string };
      }>;
      contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
      metadata?: { phone_number_id?: string };
    };
  }>;
  messaging?: Array<{
    sender?: { id?: string };
    recipient?: { id?: string };
    timestamp?: number;
    message?: { mid?: string; text?: string; is_echo?: boolean };
  }>;
};

function parseMetaPayload(
  payload: unknown,
  type: "whatsapp" | "instagram" | "messenger",
  channelId: string,
  orgId: string,
): InboundEvent[] {
  const p = payload as { object?: string; entry?: MetaEntry[] };
  if (!p?.entry?.length) return [];
  const out: InboundEvent[] = [];

  for (const entry of p.entry) {
    if (type === "whatsapp") {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;
        const v = change.value ?? {};
        const contactsByWaId = new Map(
          (v.contacts ?? []).map((c) => [c.wa_id ?? "", c.profile?.name ?? ""]),
        );
        for (const msg of v.messages ?? []) {
          if (msg.type !== "text" || !msg.from || !msg.id) continue;
          out.push({
            orgId,
            channelId,
            channelType: "whatsapp",
            externalContactId: msg.from,
            contactName: contactsByWaId.get(msg.from) || null,
            body: msg.text?.body ?? "",
            externalMessageId: msg.id,
            createdAt: msg.timestamp
              ? new Date(parseInt(msg.timestamp, 10) * 1000).toISOString()
              : null,
          });
        }
      }
      continue;
    }

    // Messenger / Instagram DMs — ambos llegan con `messaging[]`.
    for (const m of entry.messaging ?? []) {
      if (m.message?.is_echo) continue; // mensajes propios haciendo eco
      if (!m.sender?.id || !m.message?.mid) continue;
      const body = m.message.text ?? "";
      if (!body) continue;
      out.push({
        orgId,
        channelId,
        channelType: type,
        externalContactId: m.sender.id,
        body,
        externalMessageId: m.message.mid,
        createdAt: m.timestamp ? new Date(m.timestamp).toISOString() : null,
      });
    }
  }

  return out;
}
