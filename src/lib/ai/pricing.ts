// Cálculo de costos a partir del registry de proveedores.
// Si no hay precios en el registry (Ollama, custom), devolvemos 0 — la app
// igual loguea la traza para latencia/uso.

import type { LanguageModelUsage } from "ai";
import { findModel, type ProviderId } from "./registry";
import type { ProviderRow } from "./types";

/** Cuenta tokens-aproximados a partir de chars. Fallback cuando el provider
 *  no devuelve `usage` (algunos endpoints OpenAI-compatibles lo omiten). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export type CostInputs = {
  inputTokens: number;
  outputTokens?: number;
};

export function computeCost(provider: ProviderRow, inputs: CostInputs): number {
  const def = findModel(provider.provider as ProviderId, provider.model);
  if (!def) return 0;
  const input = (def.inputPer1M ?? 0) * (inputs.inputTokens / 1_000_000);
  const output = (def.outputPer1M ?? 0) * ((inputs.outputTokens ?? 0) / 1_000_000);
  return Number((input + output).toFixed(6));
}

/** Adaptador AI-SDK → nuestros números (los nombres difieren entre versiones). */
export function usageToTokens(usage: LanguageModelUsage | undefined, fallbackInput: number): {
  inputTokens: number;
  outputTokens: number;
} {
  if (!usage) {
    return { inputTokens: fallbackInput, outputTokens: 0 };
  }
  // AI SDK v6 ahora expone `inputTokens` / `outputTokens` directamente.
  // Igualmente caemos a `promptTokens` / `completionTokens` por compatibilidad.
  type LegacyUsage = { promptTokens?: number; completionTokens?: number };
  const u = usage as LanguageModelUsage & LegacyUsage;
  return {
    inputTokens: u.inputTokens ?? u.promptTokens ?? fallbackInput,
    outputTokens: u.outputTokens ?? u.completionTokens ?? 0,
  };
}
