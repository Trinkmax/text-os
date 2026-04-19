// Tipos compartidos del pipeline de inferencia. Vive separado del resto
// para no tener ciclos de import (pricing/scoring/retrieval lo consumen).

import type { Row } from "@/lib/supabase/types";
import type { Semaphore } from "@/lib/semaphore";

export type ProviderRow = Row<"textos_ai_providers">;

export type RunCtx = {
  orgId: string;
  runId: string;
  /** Suggestion id si ya se creó la sugerencia para attachear traces. */
  suggestionId: string | null;
};

export type RetrievedChunk = {
  chunk_id: string;
  card_id: string;
  chunk_text: string;
  topic: string;
  question: string;
  answer: string;
  usage_count: number;
  card_confidence: number;
  semantic_score: number;
  lexical_score: number;
  combined_score: number;
};

export type Intent =
  | "horarios"
  | "precios"
  | "ubicacion"
  | "agendar_turno"
  | "pregunta_servicio"
  | "queja"
  | "saludo"
  | "agradecimiento"
  | "otro";

export type ClassifyResult = {
  intent: Intent;
  language: string; // 'es' | 'en' | 'pt' | 'otro'
  isGreeting: boolean;
  isOutOfScope: boolean;
  mustEscalate: boolean;
  /** Nombre del trigger de must_escalate / never_promise si lo hubo. */
  triggeredRule: string | null;
  summary: string; // resumen breve del pedido del cliente
};

export type GeneratedAnswer = {
  answer: string;
  citedCardIds: string[];
  /** Confianza declarada por el modelo, 0..1 — la calibramos en scoring. */
  declaredConfidence: number;
  mentionsPriceOrSchedule: boolean;
};

export type GroundingResult = {
  /** % aproximado de la respuesta soportado por el contexto recuperado, 0..1. */
  coverage: number;
  /** Hard rules violadas (matches contra never_promise + datos inventados). */
  hardRuleHits: string[];
  /** Especificaciones potencialmente inventadas (precios/horarios sin respaldo). */
  fabricatedSpecifics: string[];
};

export type ScoringFactors = {
  retrieval_quality: number;
  grounding_coverage: number;
  prior_use: number;
  consistency: number;
  intent_fit: number;
  model_self_confidence: number;
  hard_rule_clean: number; // 1 = sin violaciones, 0 = con violaciones (hard floor)
};

export type ScoredOutcome = {
  factors: ScoringFactors;
  /** Confianza combinada antes de aplicar el hard floor / horario. */
  rawConfidence: number;
  /** Confianza final tras pisar (hard floor / fuera de horario). */
  finalConfidence: number;
  semaphore: Semaphore;
  reason: string;
  /** Si se forzó red por una regla dura; útil para auditoría. */
  hardOverride: "must_escalate" | "out_of_scope" | "hard_rule" | "no_provider" | "no_text" | null;
};
