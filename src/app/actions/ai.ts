"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { generateText, embed } from "ai";
import { z } from "zod";
import { createSbServer } from "@/lib/supabase/server";
import { requireAdminOrgId, requireOrgId } from "@/lib/org";
import type { Database, Json, Row } from "@/lib/supabase/types";
import {
  resolveLanguageModel,
  resolveEmbeddingModel,
  generationDefaults,
} from "@/lib/ai/providers";
import { findModel, PROVIDER_BY_ID } from "@/lib/ai/registry";
import { indexStaleCards, markAllCardsNoProvider } from "@/lib/ai/embeddings";

// -----------------------------------------------------------------------------
// Tipos que sí pueden llegar al cliente. `secrets` NUNCA.
// -----------------------------------------------------------------------------
export type SafeAiProvider = {
  id: string;
  nickname: string;
  provider: Row<"textos_ai_providers">["provider"];
  model: string;
  role: Row<"textos_ai_providers">["role"];
  is_default: boolean;
  is_active: boolean;
  priority: number;
  config: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    base_url?: string;
  };
  has_api_key: boolean;
  api_key_preview: string | null; // últimos 4 chars para confirmar
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  last_test_latency_ms: number | null;
  last_test_error: string | null;
  last_test_sample: string | null;
  created_at: string;
  updated_at: string;
};

function toSafe(row: Row<"textos_ai_providers">): SafeAiProvider {
  const secrets = (row.secrets ?? {}) as { api_key?: string };
  const config = (row.config ?? {}) as SafeAiProvider["config"];
  const apiKey = secrets.api_key ?? "";
  return {
    id: row.id,
    nickname: row.nickname,
    provider: row.provider,
    model: row.model,
    role: row.role,
    is_default: row.is_default,
    is_active: row.is_active,
    priority: row.priority,
    config,
    has_api_key: !!apiKey,
    api_key_preview: apiKey ? `••••${apiKey.slice(-4)}` : null,
    last_tested_at: row.last_tested_at,
    last_test_ok: row.last_test_ok,
    last_test_latency_ms: row.last_test_latency_ms,
    last_test_error: row.last_test_error,
    last_test_sample: row.last_test_sample,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// -----------------------------------------------------------------------------
// Schemas de input
// -----------------------------------------------------------------------------
const providerEnum = z.enum([
  "vercel_gateway",
  "openai",
  "anthropic",
  "google",
  "groq",
  "mistral",
  "ollama",
  "custom",
]);
const roleEnum = z.enum(["generation", "classification", "embedding"]);

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  nickname: z.string().trim().min(1, "Ponele un nombre").max(60),
  provider: providerEnum,
  model: z.string().trim().min(1),
  role: roleEnum,
  api_key: z.string().trim().optional(),
  base_url: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(16000).optional(),
  top_p: z.number().min(0).max(1).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// CRUD
// -----------------------------------------------------------------------------
export async function saveAiProvider(
  input: z.input<typeof saveSchema>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  // Validar que el modelo existe en el registry del proveedor
  // (excepto custom/ollama que permiten cualquier id).
  if (data.provider !== "custom" && data.provider !== "ollama") {
    const def = findModel(data.provider, data.model);
    if (!def) return { ok: false, error: "El modelo seleccionado no está en el catálogo" };
    if (!def.roles.includes(data.role)) {
      return { ok: false, error: `Este modelo no soporta el rol "${data.role}"` };
    }
  }

  // Validar que se pasó api_key si el proveedor la requiere.
  const providerDef = PROVIDER_BY_ID.get(data.provider);
  if (providerDef?.apiKeyField && !data.id && !data.api_key) {
    return { ok: false, error: `Este proveedor requiere una API key` };
  }
  if (data.provider === "custom" && !data.base_url) {
    return { ok: false, error: "Los proveedores personalizados requieren una URL base" };
  }

  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();

  const config: Json = {
    ...(data.temperature !== undefined ? { temperature: data.temperature } : {}),
    ...(data.max_tokens !== undefined ? { max_tokens: data.max_tokens } : {}),
    ...(data.top_p !== undefined ? { top_p: data.top_p } : {}),
    ...(data.base_url ? { base_url: data.base_url } : {}),
  };

  // Si se marca como default, desmarcar los otros de ese rol.
  if (data.is_default) {
    await sb
      .from("textos_ai_providers")
      .update({ is_default: false })
      .eq("org_id", orgId)
      .eq("role", data.role);
  }

  if (data.id) {
    // Edición: sólo actualizamos api_key si vino una nueva.
    const updatePayload: Database["public"]["Tables"]["textos_ai_providers"]["Update"] = {
      nickname: data.nickname,
      provider: data.provider,
      model: data.model,
      role: data.role,
      config,
      is_default: data.is_default ?? false,
      is_active: data.is_active ?? true,
    };
    if (data.api_key) {
      updatePayload.secrets = { api_key: data.api_key };
    }
    const { error } = await sb
      .from("textos_ai_providers")
      .update(updatePayload)
      .eq("id", data.id)
      .eq("org_id", orgId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/ajustes");
    return { ok: true, id: data.id };
  }

  const insertPayload: Database["public"]["Tables"]["textos_ai_providers"]["Insert"] = {
    org_id: orgId,
    nickname: data.nickname,
    provider: data.provider,
    model: data.model,
    role: data.role,
    config,
    secrets: data.api_key ? { api_key: data.api_key } : {},
    is_default: data.is_default ?? true,
    is_active: data.is_active ?? true,
  };
  const { data: inserted, error } = await sb
    .from("textos_ai_providers")
    .insert(insertPayload)
    .select("id")
    .single();
  if (error || !inserted) return { ok: false, error: error?.message ?? "No se pudo guardar" };

  // Si es el primer provider de embeddings de la org, disparamos un re-indexado
  // completo de las cards en background para que la búsqueda semántica funcione
  // sin que el usuario tenga que pedirlo.
  if (data.role === "embedding") {
    const insertedId = inserted.id;
    after(async () => {
      const { data: row } = await sb
        .from("textos_ai_providers")
        .select("*")
        .eq("id", insertedId)
        .eq("org_id", orgId)
        .single();
      if (!row) return;
      try {
        await indexStaleCards(orgId, row);
      } catch {
        // Cada card tiene su propio error registrado.
      }
    });
  }

  revalidatePath("/ajustes");
  return { ok: true, id: inserted.id };
}

export async function deleteAiProvider(id: string) {
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();
  // Capturar el rol antes de borrar para saber si era el último de embeddings.
  const { data: target } = await sb
    .from("textos_ai_providers")
    .select("role")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();
  const { error } = await sb
    .from("textos_ai_providers")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) return { ok: false as const, error: error.message };

  // Si era el último embedding provider activo, marcamos las cards como
  // no_provider para que la UI muestre el estado correcto.
  if (target?.role === "embedding") {
    const { count } = await sb
      .from("textos_ai_providers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "embedding")
      .eq("is_active", true);
    if (!count) {
      after(async () => {
        await markAllCardsNoProvider(orgId);
      });
    }
  }

  revalidatePath("/ajustes");
  return { ok: true as const };
}

export async function setDefaultAiProvider(id: string) {
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();
  const { data: target } = await sb
    .from("textos_ai_providers")
    .select("id, role")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();
  if (!target) return { ok: false as const, error: "Proveedor no encontrado" };

  await sb
    .from("textos_ai_providers")
    .update({ is_default: false })
    .eq("org_id", orgId)
    .eq("role", target.role);

  const { error } = await sb
    .from("textos_ai_providers")
    .update({ is_default: true, is_active: true })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/ajustes");
  return { ok: true as const };
}

export async function toggleAiProviderActive(id: string, active: boolean) {
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();
  const { error } = await sb
    .from("textos_ai_providers")
    .update({ is_active: active, ...(active ? {} : { is_default: false }) })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/ajustes");
  return { ok: true as const };
}

// -----------------------------------------------------------------------------
// Test de conexión: llamada real al proveedor para confirmar que responde.
// -----------------------------------------------------------------------------
export type TestResult =
  | { ok: true; latencyMs: number; sample: string }
  | { ok: false; latencyMs: number; error: string };

export async function testAiProvider(id: string): Promise<TestResult> {
  const orgId = await requireOrgId();
  const sb = await createSbServer();

  const { data: row } = await sb
    .from("textos_ai_providers")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();
  if (!row) return { ok: false, latencyMs: 0, error: "Proveedor no encontrado" };

  const started = Date.now();
  try {
    let sample = "";
    if (row.role === "embedding") {
      const model = resolveEmbeddingModel(row);
      const { embedding } = await embed({ model, value: "ping" });
      sample = `vector dim=${embedding.length}`;
    } else {
      const model = resolveLanguageModel(row);
      const defaults = generationDefaults(row);
      const { text } = await generateText({
        model,
        prompt:
          'Respondé sólo con las tres letras "ok". No agregues nada más, ni puntuación.',
        temperature: 0,
        // OpenAI exige >= 16. Damos algo de headroom para no rozar el límite.
        maxOutputTokens: 32,
      });
      sample = text.trim().slice(0, 80) || "(respuesta vacía)";
      // usar `defaults` nada más que para asegurar referencia en build.
      void defaults;
    }
    const latencyMs = Date.now() - started;
    await sb
      .from("textos_ai_providers")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_ok: true,
        last_test_latency_ms: latencyMs,
        last_test_error: null,
        last_test_sample: sample,
      })
      .eq("id", id)
      .eq("org_id", orgId);
    revalidatePath("/ajustes");
    return { ok: true, latencyMs, sample };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const error = err instanceof Error ? err.message : String(err);
    await sb
      .from("textos_ai_providers")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_ok: false,
        last_test_latency_ms: latencyMs,
        last_test_error: error.slice(0, 500),
        last_test_sample: null,
      })
      .eq("id", id)
      .eq("org_id", orgId);
    revalidatePath("/ajustes");
    return { ok: false, latencyMs, error };
  }
}

// -----------------------------------------------------------------------------
// Listado para la UI de ajustes.
// -----------------------------------------------------------------------------
export async function listAiProviders(): Promise<SafeAiProvider[]> {
  const orgId = await requireOrgId();
  const sb = await createSbServer();
  const { data } = await sb
    .from("textos_ai_providers")
    .select("*")
    .eq("org_id", orgId)
    .order("role", { ascending: true })
    .order("is_default", { ascending: false })
    .order("priority", { ascending: true });
  return (data ?? []).map(toSafe);
}
