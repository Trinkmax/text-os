import { createSbService } from "./service";

export type SendResult =
  | { ok: true; externalMessageId: string | null }
  | { ok: false; error: string };

/**
 * Envía un mensaje saliente al proveedor del canal y devuelve el id externo.
 * El caller ya debe haber insertado el `textos_messages` en `queued` — acá
 * se actualiza a `sent` / `failed` según el resultado.
 */
export async function sendMessageViaChannel(input: {
  channelId: string;
  /** Contact side — PSID, phone, widget session id, email address. */
  toExternalId: string;
  body: string;
  /** Id de nuestro textos_messages para poder actualizar estado. */
  messageId: string;
}): Promise<SendResult> {
  const sb = createSbService();

  const { data: channel } = await sb
    .from("textos_channels")
    .select("id, org_id, type, status, config, secrets")
    .eq("id", input.channelId)
    .single();

  if (!channel) return fail(sb, input.messageId, "Canal no encontrado");
  if (channel.status !== "connected")
    return fail(sb, input.messageId, "El canal no está conectado");

  try {
    const result = await dispatchByType(channel, input);
    if (!result.ok) return fail(sb, input.messageId, result.error);

    await sb
      .from("textos_messages")
      .update({
        delivery_status: "sent",
        external_id: result.externalMessageId ?? null,
        delivery_error: null,
      })
      .eq("id", input.messageId);

    return { ok: true, externalMessageId: result.externalMessageId ?? null };
  } catch (err) {
    return fail(sb, input.messageId, err instanceof Error ? err.message : String(err));
  }
}

async function dispatchByType(
  channel: {
    id: string;
    type: string;
    config: unknown;
    secrets: unknown;
  },
  input: { toExternalId: string; body: string },
): Promise<SendResult> {
  const config = (channel.config ?? {}) as Record<string, string>;
  const secrets = (channel.secrets ?? {}) as Record<string, string>;

  if (channel.type === "whatsapp") {
    const phoneNumberId = config.phone_number_id;
    const token = secrets.access_token;
    if (!phoneNumberId || !token)
      return { ok: false, error: "WhatsApp: faltan phone_number_id o access_token" };
    return await postWithRetry(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: input.toExternalId,
        type: "text",
        text: { preview_url: false, body: input.body },
      },
      { Authorization: `Bearer ${token}` },
      (json) => {
        const m = json as { messages?: Array<{ id: string }> };
        return m.messages?.[0]?.id ?? null;
      },
    );
  }

  if (channel.type === "messenger" || channel.type === "instagram") {
    const token = secrets.page_access_token;
    if (!token) return { ok: false, error: "Meta: falta page_access_token" };
    return await postWithRetry(
      `https://graph.facebook.com/v22.0/me/messages?access_token=${encodeURIComponent(token)}`,
      {
        recipient: { id: input.toExternalId },
        messaging_type: "RESPONSE",
        message: { text: input.body },
      },
      {},
      (json) => {
        const m = json as { message_id?: string };
        return m.message_id ?? null;
      },
    );
  }

  if (channel.type === "webchat") {
    // El widget escucha Realtime directo; no hay fetch externo.
    return { ok: true, externalMessageId: null };
  }

  if (channel.type === "email") {
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "noreply@textos.app";
    if (!resendKey)
      return { ok: false, error: "Email: configurá RESEND_API_KEY para habilitar envío" };
    return await postWithRetry(
      "https://api.resend.com/emails",
      {
        from,
        to: [input.toExternalId],
        subject: "Re: conversación",
        text: input.body,
      },
      { Authorization: `Bearer ${resendKey}` },
      (json) => {
        const m = json as { id?: string };
        return m.id ?? null;
      },
    );
  }

  return { ok: false, error: `Tipo de canal no soportado: ${channel.type}` };
}

async function postWithRetry(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  extractId: (json: unknown) => string | null,
): Promise<SendResult> {
  let lastErr = "sin respuesta";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as unknown;
        return { ok: true, externalMessageId: extractId(json) };
      }
      const txt = await res.text().catch(() => "");
      lastErr = `${res.status} ${txt.slice(0, 300)}`;
      // 4xx (excepto 429) — no tiene sentido reintentar.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
    await sleep(200 * 2 ** attempt);
  }
  return { ok: false, error: lastErr };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fail(sb: ReturnType<typeof createSbService>, messageId: string, error: string) {
  await sb
    .from("textos_messages")
    .update({ delivery_status: "failed", delivery_error: error.slice(0, 500) })
    .eq("id", messageId);
  return { ok: false as const, error };
}
