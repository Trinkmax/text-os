import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { createSbService } from "@/lib/channels/service";
import { ingestInboundMessage } from "@/lib/channels/ingest";

// Email inbound: cualquier proveedor (Resend, Mailgun, Postmark, SendGrid)
// posteando JSON con el email parseado. Autenticamos con un secret
// compartido en `EMAIL_WEBHOOK_SECRET` usando HMAC SHA-256 sobre el body
// crudo, en el header `x-textos-signature`.

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ alias: string }> },
) {
  const { alias } = await context.params;
  const raw = await request.text();

  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-textos-signature") ?? "";
    if (!verifyHmac(header, raw, secret)) {
      return new NextResponse("bad signature", { status: 401 });
    }
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return new NextResponse("invalid json", { status: 400 });
  }

  const parsed = normalizeEmailPayload(json);
  if (!parsed) return new NextResponse("unsupported payload", { status: 422 });

  const sb = createSbService();
  const { data: channel } = await sb
    .from("textos_channels")
    .select("id, org_id, status")
    .eq("type", "email")
    .filter("config->>inbox_alias", "eq", alias)
    .single();

  if (!channel) return new NextResponse("not found", { status: 404 });
  if (channel.status !== "connected") {
    return new NextResponse("channel not active", { status: 412 });
  }

  after(async () => {
    await ingestInboundMessage({
      orgId: channel.org_id,
      channelId: channel.id,
      channelType: "email",
      externalContactId: parsed.from,
      contactName: parsed.fromName,
      body: parsed.body,
      externalMessageId: parsed.messageId,
      createdAt: parsed.date ?? null,
    });
  });

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------

function verifyHmac(header: string, raw: string, secret: string) {
  if (!header) return false;
  const computed = createHmac("sha256", secret).update(raw).digest("hex");
  // Aceptamos el header tal cual (hex) o con prefijo `sha256=`.
  const received = header.startsWith("sha256=") ? header.slice(7) : header;
  if (received.length !== computed.length) return false;
  try {
    return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(computed, "hex"));
  } catch {
    return false;
  }
}

type Normalized = {
  from: string;
  fromName: string | null;
  body: string;
  subject: string | null;
  messageId: string;
  date: string | null;
};

// Aceptamos los shapes de Resend/Postmark/Mailgun/SendGrid. Todos traen
// las mismas cosas con nombres distintos.
function normalizeEmailPayload(raw: unknown): Normalized | null {
  const r = raw as Record<string, unknown>;
  if (!r) return null;

  // Resend "inbound" / genérico con objeto `data`.
  const data = (r.data as Record<string, unknown> | undefined) ?? r;

  const fromField =
    (data.from as string | Record<string, unknown>) ??
    (data.From as string) ??
    (data.sender as string) ??
    "";
  const { address: fromAddress, name: fromName } = parseAddress(fromField);
  if (!fromAddress) return null;

  const text =
    (data.text as string) ||
    (data.TextBody as string) ||
    (data["body-plain"] as string) ||
    stripHtml((data.html as string) || (data.HtmlBody as string) || "") ||
    "";
  const subject = (data.subject as string) || (data.Subject as string) || null;
  const messageId =
    (data.messageId as string) ||
    (data.MessageID as string) ||
    (data["message-id"] as string) ||
    (data.id as string) ||
    `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const date = (data.date as string) || (data.Date as string) || null;

  const body = subject ? `Asunto: ${subject}\n\n${text}` : text;

  return {
    from: fromAddress,
    fromName: fromName,
    body: body.slice(0, 8000),
    subject,
    messageId,
    date,
  };
}

function parseAddress(
  field: string | Record<string, unknown> | undefined,
): { address: string; name: string | null } {
  if (!field) return { address: "", name: null };
  if (typeof field === "object") {
    const address = (field.address as string) || (field.email as string) || "";
    const name = (field.name as string) || (field.Name as string) || null;
    return { address, name };
  }
  const match = field.match(/^(?:"?([^"<]*?)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/);
  if (match) return { address: match[2] || "", name: (match[1] || "").trim() || null };
  return { address: field, name: null };
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
