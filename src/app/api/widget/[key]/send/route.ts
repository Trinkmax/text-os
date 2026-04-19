import { after, NextResponse } from "next/server";
import { z } from "zod";
import { createSbService } from "@/lib/channels/service";
import { ingestInboundMessage } from "@/lib/channels/ingest";

export const runtime = "nodejs";

const Payload = z.object({
  session: z.string().min(6).max(64),
  body: z.string().trim().min(1).max(4000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = Payload.safeParse(json);
  if (!parsed.success) return corsJson({ error: "bad request" }, 400);

  const sb = createSbService();
  const { data: channel } = await sb
    .from("textos_channels")
    .select("id, org_id, status, config")
    .eq("type", "webchat")
    .filter("config->>widget_key", "eq", key)
    .single();

  if (!channel || channel.status !== "connected") {
    return corsJson({ error: "not found" }, 404);
  }

  const origin = request.headers.get("origin") ?? "";
  const cfg = (channel.config ?? {}) as { allowed_domains?: string[] };
  if (!isOriginAllowed(origin, cfg.allowed_domains ?? [])) {
    return corsJson({ error: "domain not allowed" }, 403);
  }

  // externalMessageId único por envío, aunque el usuario toque "enviar" dos
  // veces la misma frase: usamos timestamp + session.
  const externalMessageId = `widget_${parsed.data.session}_${Date.now()}`;

  after(async () => {
    await ingestInboundMessage({
      orgId: channel.org_id,
      channelId: channel.id,
      channelType: "webchat",
      externalContactId: parsed.data.session,
      body: parsed.data.body,
      externalMessageId,
    });
  });

  return corsJson({ ok: true, id: externalMessageId });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function isOriginAllowed(origin: string, allowed: string[]) {
  if (!allowed.length) return true; // sin restricción — confiamos en el widget_key
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return allowed.some((d) => {
      const norm = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      return host === norm || host.endsWith("." + norm);
    });
  } catch {
    return false;
  }
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  } as Record<string, string>;
}

function corsJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders() });
}
