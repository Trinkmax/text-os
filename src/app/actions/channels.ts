"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSbServer } from "@/lib/supabase/server";
import { requireAdminOrgId } from "@/lib/org";

export type ChannelType = "whatsapp" | "instagram" | "messenger" | "webchat" | "email";
export type ChannelStatus = "connected" | "pending" | "disconnected";

// Shape we return to the client. Secrets NEVER leak.
export type SafeChannel = {
  id: string;
  type: ChannelType;
  status: ChannelStatus;
  label: string | null;
  external_id: string | null;
  config: Record<string, unknown>;
  verified_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

const CHANNEL_COLUMNS =
  "id, type, status, label, external_id, config, verified_at, last_error, created_at, updated_at";

/** Generate a URL-safe random token. */
function token(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

/** Fetch all channels for the active org, without secrets. */
export async function listChannels(): Promise<SafeChannel[]> {
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();
  const { data, error } = await sb
    .from("textos_channels")
    .select(CHANNEL_COLUMNS)
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as unknown as SafeChannel[];
}

// ---------------------------------------------------------------------------
// Start connection — creates a pending channel with the long-lived pieces the
// provider needs (verify token for Meta, widget key for Webchat, inbox alias
// for Email). Returns the channel id so the modal can continue the flow.
// ---------------------------------------------------------------------------

const StartSchema = z.object({
  type: z.enum(["whatsapp", "instagram", "messenger", "webchat", "email"]),
  label: z.string().trim().max(60).optional(),
});

export async function startConnection(input: z.infer<typeof StartSchema>) {
  const { type, label } = StartSchema.parse(input);
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();

  const config: Record<string, unknown> = {};
  const secrets: Record<string, unknown> = {};

  if (type === "whatsapp" || type === "instagram" || type === "messenger") {
    secrets.verify_token = token(18);
  }
  if (type === "webchat") {
    config.widget_key = token(12);
    config.allowed_domains = [];
    config.greeting = "¡Hola! Contanos en qué te ayudamos.";
    config.accent_color = "#8B5CF6";
  }
  if (type === "email") {
    config.inbox_alias = `inbox-${token(8).toLowerCase()}`;
  }

  const insertPayload = {
    org_id: orgId,
    type,
    status: "pending" as const,
    label: label ?? null,
    config: config as never,
    secrets: secrets as never,
  };
  const { data, error } = await sb
    .from("textos_channels")
    .insert(insertPayload)
    .select(CHANNEL_COLUMNS)
    .single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "No se pudo crear el canal" };
  }
  revalidatePath("/ajustes");
  return { ok: true as const, channel: data as unknown as SafeChannel };
}

// ---------------------------------------------------------------------------
// Per-provider save. Each takes the channelId + the provider-specific fields
// and moves the channel to `connected`. We keep secrets in `secrets` and the
// user-visible ids in `config` so the settings UI can show what's wired up
// without ever sending the access token to the browser.
// ---------------------------------------------------------------------------

const WhatsappSchema = z.object({
  channelId: z.string().uuid(),
  label: z.string().trim().min(1).max(60),
  phoneNumberId: z.string().trim().min(5),
  wabaId: z.string().trim().min(5),
  displayNumber: z.string().trim().min(4),
  accessToken: z.string().trim().min(10),
});

export async function saveWhatsApp(input: z.infer<typeof WhatsappSchema>) {
  const v = WhatsappSchema.parse(input);
  return await persistProviderConfig(v.channelId, "whatsapp", {
    label: v.label,
    external_id: v.phoneNumberId,
    config: {
      phone_number_id: v.phoneNumberId,
      waba_id: v.wabaId,
      display_number: v.displayNumber,
    },
    secrets: { access_token: v.accessToken },
  });
}

const MetaPageSchema = z.object({
  channelId: z.string().uuid(),
  type: z.enum(["instagram", "messenger"]),
  label: z.string().trim().min(1).max(60),
  pageId: z.string().trim().min(5),
  pageAccessToken: z.string().trim().min(10),
  appSecret: z.string().trim().min(10),
  igBusinessId: z.string().trim().optional(),
});

export async function saveMetaPage(input: z.infer<typeof MetaPageSchema>) {
  const v = MetaPageSchema.parse(input);
  return await persistProviderConfig(v.channelId, v.type, {
    label: v.label,
    external_id: v.type === "instagram" ? v.igBusinessId || v.pageId : v.pageId,
    config: {
      page_id: v.pageId,
      ...(v.igBusinessId ? { ig_business_id: v.igBusinessId } : {}),
    },
    secrets: { page_access_token: v.pageAccessToken, app_secret: v.appSecret },
  });
}

const WebchatSchema = z.object({
  channelId: z.string().uuid(),
  label: z.string().trim().min(1).max(60),
  greeting: z.string().trim().max(140),
  accentColor: z
    .string()
    .trim()
    .regex(/^#?[0-9a-fA-F]{6}$/, "Color hex inválido"),
  allowedDomains: z.array(z.string().trim().min(3)).max(10),
});

export async function saveWebchat(input: z.infer<typeof WebchatSchema>) {
  const v = WebchatSchema.parse(input);
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();

  const { data: current } = await sb
    .from("textos_channels")
    .select("config")
    .eq("org_id", orgId)
    .eq("id", v.channelId)
    .single();

  const current_config = (current?.config ?? {}) as Record<string, unknown>;

  const { error } = await sb
    .from("textos_channels")
    .update({
      label: v.label,
      status: "connected",
      verified_at: new Date().toISOString(),
      last_error: null,
      config: {
        ...current_config,
        greeting: v.greeting,
        accent_color: v.accentColor.startsWith("#") ? v.accentColor : `#${v.accentColor}`,
        allowed_domains: v.allowedDomains,
      } as never,
    })
    .eq("org_id", orgId)
    .eq("id", v.channelId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/ajustes");
  return { ok: true as const };
}

const EmailSchema = z.object({
  channelId: z.string().uuid(),
  label: z.string().trim().min(1).max(60),
  forwardTo: z.string().email(),
  signature: z.string().trim().max(280).optional(),
});

export async function saveEmail(input: z.infer<typeof EmailSchema>) {
  const v = EmailSchema.parse(input);
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();

  const { data: current } = await sb
    .from("textos_channels")
    .select("config")
    .eq("org_id", orgId)
    .eq("id", v.channelId)
    .single();
  const current_config = (current?.config ?? {}) as Record<string, unknown>;

  const { error } = await sb
    .from("textos_channels")
    .update({
      label: v.label,
      status: "connected",
      external_id: v.forwardTo,
      verified_at: new Date().toISOString(),
      last_error: null,
      config: {
        ...current_config,
        forward_to: v.forwardTo,
        signature: v.signature ?? null,
      } as never,
    })
    .eq("org_id", orgId)
    .eq("id", v.channelId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/ajustes");
  return { ok: true as const };
}

// Shared writer for Meta-style providers (WhatsApp/Instagram/Messenger).
// The channel stays in `pending` until the webhook handshake succeeds — the
// webhook route at /api/webhooks/channels/[id] flips verified_at + status.
async function persistProviderConfig(
  channelId: string,
  type: ChannelType,
  patch: {
    label: string;
    external_id: string | null;
    config: Record<string, unknown>;
    secrets: Record<string, unknown>;
  },
) {
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();

  const { data: current } = await sb
    .from("textos_channels")
    .select("config, secrets, type")
    .eq("org_id", orgId)
    .eq("id", channelId)
    .single();

  if (!current) return { ok: false as const, error: "Canal no encontrado" };
  if (current.type !== type) return { ok: false as const, error: "Tipo de canal incorrecto" };

  const prevConfig = (current.config ?? {}) as Record<string, unknown>;
  const prevSecrets = (current.secrets ?? {}) as Record<string, unknown>;
  const { error } = await sb
    .from("textos_channels")
    .update({
      label: patch.label,
      external_id: patch.external_id,
      status: "pending",
      last_error: null,
      config: { ...prevConfig, ...patch.config } as never,
      secrets: { ...prevSecrets, ...patch.secrets } as never,
    })
    .eq("org_id", orgId)
    .eq("id", channelId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/ajustes");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Management actions
// ---------------------------------------------------------------------------

export async function renameChannel(channelId: string, label: string) {
  const orgId = await requireAdminOrgId();
  const trimmed = label.trim().slice(0, 60);
  if (!trimmed) return { ok: false as const, error: "El nombre no puede estar vacío" };

  const sb = await createSbServer();
  const { error } = await sb
    .from("textos_channels")
    .update({ label: trimmed })
    .eq("org_id", orgId)
    .eq("id", channelId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/ajustes");
  return { ok: true as const };
}

export async function disconnectChannel(channelId: string) {
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();
  const { error } = await sb
    .from("textos_channels")
    .update({ status: "disconnected", verified_at: null })
    .eq("org_id", orgId)
    .eq("id", channelId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/ajustes");
  return { ok: true as const };
}

export async function deleteChannel(channelId: string) {
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();
  const { error } = await sb
    .from("textos_channels")
    .delete()
    .eq("org_id", orgId)
    .eq("id", channelId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/ajustes");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Verify token exposure — only readable from server. Used by the modal to
// show the verify token once so the admin can paste it into Meta.
// ---------------------------------------------------------------------------

export async function getVerifyToken(channelId: string) {
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();
  const { data } = await sb
    .from("textos_channels")
    .select("secrets")
    .eq("org_id", orgId)
    .eq("id", channelId)
    .single();
  const secrets = (data?.secrets ?? {}) as Record<string, unknown>;
  const t = typeof secrets.verify_token === "string" ? secrets.verify_token : null;
  return { verifyToken: t };
}
