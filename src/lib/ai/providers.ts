// Capa de inferencia: resuelve un `LanguageModel` del AI SDK v6 a partir de
// la fila `textos_ai_providers` seleccionada para la org.
// Se llama desde server actions y desde el pipeline de sugerencias.

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGateway } from "@ai-sdk/gateway";
import type { LanguageModel, EmbeddingModel } from "ai";
import type { Row } from "@/lib/supabase/types";
import { createSbService } from "@/lib/channels/service";
import type { ProviderId, Role } from "./registry";

type ProviderRow = Row<"textos_ai_providers">;

type SecretsShape = { api_key?: string; project_id?: string };
type ConfigShape = {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  base_url?: string;
  timeout_ms?: number;
};

function getSecrets(row: ProviderRow): SecretsShape {
  return (row.secrets ?? {}) as SecretsShape;
}

function getConfig(row: ProviderRow): ConfigShape {
  return (row.config ?? {}) as ConfigShape;
}

/**
 * Convierte una fila de `textos_ai_providers` en un LanguageModel de AI SDK v6.
 * La firma exacta para cada proveedor viene del SDK de cada uno.
 */
export function resolveLanguageModel(row: ProviderRow): LanguageModel {
  const secrets = getSecrets(row);
  const config = getConfig(row);
  const provider = row.provider as ProviderId;

  switch (provider) {
    case "vercel_gateway": {
      const gw = createGateway({ apiKey: secrets.api_key });
      return gw(row.model);
    }
    case "openai": {
      if (!secrets.api_key) throw new Error("OpenAI requiere api_key");
      const openai = createOpenAI({
        apiKey: secrets.api_key,
        ...(config.base_url ? { baseURL: config.base_url } : {}),
      });
      return openai(row.model);
    }
    case "anthropic": {
      if (!secrets.api_key) throw new Error("Anthropic requiere api_key");
      const anthropic = createAnthropic({ apiKey: secrets.api_key });
      return anthropic(row.model);
    }
    case "google": {
      if (!secrets.api_key) throw new Error("Google requiere api_key");
      const google = createGoogleGenerativeAI({ apiKey: secrets.api_key });
      return google(row.model);
    }
    case "groq": {
      if (!secrets.api_key) throw new Error("Groq requiere api_key");
      // Groq expone API compatible con OpenAI.
      const groq = createOpenAI({
        apiKey: secrets.api_key,
        baseURL: "https://api.groq.com/openai/v1",
      });
      return groq(row.model);
    }
    case "mistral": {
      if (!secrets.api_key) throw new Error("Mistral requiere api_key");
      const mistral = createOpenAI({
        apiKey: secrets.api_key,
        baseURL: "https://api.mistral.ai/v1",
      });
      return mistral(row.model);
    }
    case "ollama": {
      const baseURL = config.base_url ?? "http://localhost:11434/v1";
      const ollama = createOpenAI({ apiKey: "ollama", baseURL });
      return ollama(row.model);
    }
    case "custom": {
      if (!config.base_url) throw new Error("Custom requiere base_url");
      const custom = createOpenAI({
        apiKey: secrets.api_key ?? "",
        baseURL: config.base_url,
      });
      return custom(row.model);
    }
    default: {
      throw new Error(`Proveedor no soportado: ${provider}`);
    }
  }
}

/**
 * Resuelve el LanguageModel activo para una org + rol (el marcado is_default,
 * o el de mayor priority si no hay default).
 */
export async function getActiveLanguageModel(
  orgId: string,
  role: Role,
): Promise<{ model: LanguageModel; row: ProviderRow } | null> {
  const data = await getActiveProviderRow(orgId, role);
  if (!data) return null;
  return { model: resolveLanguageModel(data), row: data };
}

/** Sólo la fila — útil cuando vas a usar embed/generateObject por separado. */
export async function getActiveProviderRow(
  orgId: string,
  role: Role,
): Promise<ProviderRow | null> {
  const sb = createSbService();
  const { data } = await sb
    .from("textos_ai_providers")
    .select("*")
    .eq("org_id", orgId)
    .eq("role", role)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("priority", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

/**
 * Convierte una fila en EmbeddingModel. AI SDK v6 tiene APIs separadas
 * para embeddings (`.embedding(modelId)` / `.textEmbeddingModel(modelId)`).
 */
export function resolveEmbeddingModel(row: ProviderRow): EmbeddingModel {
  const secrets = getSecrets(row);
  const config = getConfig(row);
  const provider = row.provider as ProviderId;

  switch (provider) {
    case "vercel_gateway": {
      const gw = createGateway({ apiKey: secrets.api_key });
      return gw.textEmbeddingModel(row.model);
    }
    case "openai": {
      if (!secrets.api_key) throw new Error("OpenAI requiere api_key");
      const openai = createOpenAI({ apiKey: secrets.api_key });
      return openai.textEmbeddingModel(row.model);
    }
    case "google": {
      if (!secrets.api_key) throw new Error("Google requiere api_key");
      const google = createGoogleGenerativeAI({ apiKey: secrets.api_key });
      return google.textEmbeddingModel(row.model);
    }
    case "mistral": {
      if (!secrets.api_key) throw new Error("Mistral requiere api_key");
      const mistral = createOpenAI({
        apiKey: secrets.api_key,
        baseURL: "https://api.mistral.ai/v1",
      });
      return mistral.textEmbeddingModel(row.model);
    }
    case "ollama": {
      const baseURL = config.base_url ?? "http://localhost:11434/v1";
      const ollama = createOpenAI({ apiKey: "ollama", baseURL });
      return ollama.textEmbeddingModel(row.model);
    }
    case "custom": {
      if (!config.base_url) throw new Error("Custom requiere base_url");
      const custom = createOpenAI({
        apiKey: secrets.api_key ?? "",
        baseURL: config.base_url,
      });
      return custom.textEmbeddingModel(row.model);
    }
    default: {
      throw new Error(`Embeddings no soportados para ${provider}`);
    }
  }
}

/** Parámetros default de generación si el config es vacío. */
export function generationDefaults(row: ProviderRow) {
  const cfg = getConfig(row);
  return {
    temperature: cfg.temperature ?? 0.4,
    maxOutputTokens: cfg.max_tokens ?? 400,
    topP: cfg.top_p ?? undefined,
  };
}
