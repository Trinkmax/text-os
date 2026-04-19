import { NextResponse } from "next/server";
import { createSbService } from "@/lib/channels/service";

// Devuelve la config pública del widget (greeting, color, título) a partir
// del widget_key. No incluye ningún secreto. CORS abierto para que cualquier
// dominio permitido pueda pedirla.

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const sb = createSbService();
  const { data } = await sb
    .from("textos_channels")
    .select("id, status, config, org_id")
    .eq("type", "webchat")
    .filter("config->>widget_key", "eq", key)
    .single();

  if (!data || data.status !== "connected") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const cfg = (data.config ?? {}) as Record<string, unknown>;
  return NextResponse.json(
    {
      channel_id: data.id,
      greeting: cfg.greeting ?? "¡Hola! Contanos en qué te ayudamos.",
      accent_color: cfg.accent_color ?? "#8B5CF6",
      title: cfg.title ?? "Conversemos",
    },
    {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=30",
      },
    },
  );
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
