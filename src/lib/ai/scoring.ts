// Scoring multifactorial. Pesos centralizados, comentados con la intención
// de cada factor. Editables sin tocar el resto del pipeline.
//
// Filosofía:
// - Un factor objetivo (grounding_coverage) pesa más que la auto-confianza
//   del modelo (que se sobreestima).
// - El uso histórico (prior_use) es el mejor predictor de exito; pesa fuerte.
// - Las hard rules NO son un peso: son un piso. Si se violan, capeamos a
//   ámbar pase lo que pase. Esto está implementado abajo, no en los pesos.

import type {
  ClassifyResult,
  GeneratedAnswer,
  GroundingResult,
  RetrievedChunk,
  ScoredOutcome,
  ScoringFactors,
} from "./types";
import type { Semaphore } from "@/lib/semaphore";
import { tokenSimilarity } from "./text-utils";

// =========================================================================
// PESOS — modificá acá si querés rebalancear el comportamiento de la IA.
// Tienen que sumar 1.0.
// =========================================================================
export const WEIGHTS: Record<keyof Omit<ScoringFactors, "hard_rule_clean">, number> = {
  // Calidad del retrieval. Mide si encontramos *algo* relevante en el
  // conocimiento. Sin retrieval bueno, el resto importa menos.
  retrieval_quality: 0.18,
  // Grounding objetivo (cobertura de la respuesta soportada por el contexto).
  // El factor más importante: separa "respondió desde su memoria" de
  // "respondió desde lo que sabemos".
  grounding_coverage: 0.27,
  // Uso histórico de la card top-1. Lo que ya respondiste muchas veces y
  // funcionó es el signal más confiable que tenés.
  prior_use: 0.20,
  // Consistencia entre dos pasadas a temperatura baja. Detecta alucinación
  // y respuestas inestables. Aporta poco pero corrige bordes.
  consistency: 0.10,
  // Encaje de la intención clasificada con lo que la org cubre. Reduce el
  // verde para preguntas tangenciales aunque el grounding sea alto.
  intent_fit: 0.15,
  // Auto-confianza declarada por el modelo, calibrada (cap 0.85).
  // Pesa lo justo: los LLMs son optimistas crónicos.
  model_self_confidence: 0.10,
};

// =========================================================================
// Cálculos por factor
// =========================================================================

/** Calidad de retrieval: combinamos top-1 score y la mediana del top-3.
 *  Si no recuperamos nada relevante, devolvemos 0. */
export function retrievalQualityFactor(chunks: RetrievedChunk[]): number {
  if (chunks.length === 0) return 0;
  const top1 = chunks[0].combined_score;
  const top3 = chunks.slice(0, 3);
  const median = top3.length ? top3[Math.floor(top3.length / 2)].combined_score : top1;
  // Mezcla suave; clamp a [0,1].
  const raw = 0.6 * top1 + 0.4 * median;
  return Math.max(0, Math.min(1, raw));
}

/** Uso previo: reescala log de uses del top card. >=10 usos = 1.0. */
export function priorUseFactor(chunks: RetrievedChunk[]): number {
  if (chunks.length === 0) return 0;
  const uses = chunks[0].usage_count ?? 0;
  if (uses <= 0) return 0;
  return Math.min(1, Math.log(1 + uses) / Math.log(1 + 10));
}

/** Consistencia: similitud Jaccard entre dos pasadas. */
export function consistencyFactor(answerA: string, answerB: string | null): number {
  if (!answerB) return 0.5; // sin segunda pasada, valor neutro
  return Math.max(0, Math.min(1, tokenSimilarity(answerA, answerB)));
}

/** Encaje de intent. Si está fuera de scope o requiere escalate, 0. */
export function intentFitFactor(intent: ClassifyResult): number {
  if (intent.mustEscalate || intent.isOutOfScope) return 0;
  // Saludos/agradecimientos cuentan como encaje pleno (no requieren conocimiento).
  if (intent.isGreeting) return 1;
  return 0.85; // levemente debajo del tope; reconoce que el clasificador puede errar
}

/** Calibrar la confianza del modelo. Cap superior y compresión inferior. */
export function calibratedSelfConfidence(declared: number): number {
  if (!Number.isFinite(declared)) return 0.5;
  const capped = Math.min(0.85, Math.max(0, declared));
  return capped * 0.9; // damping general — los LLMs son optimistas
}

/** Hard rules: 1 si limpio, 0 si hay violación. NO se multiplica por peso —
 *  actúa como floor (ver `combineFactors`). */
export function hardRuleClean(grounding: GroundingResult): number {
  return grounding.hardRuleHits.length === 0 && grounding.fabricatedSpecifics.length === 0
    ? 1
    : 0;
}

// =========================================================================
// Combinador
// =========================================================================

export function combineFactors(args: {
  chunks: RetrievedChunk[];
  intent: ClassifyResult;
  generated: GeneratedAnswer;
  consistencyAnswer: string | null;
  grounding: GroundingResult;
  thresholds: { auto: number; suggest: number };
  shadowMode: boolean;
  outsideHours: boolean;
}): ScoredOutcome {
  const factors: ScoringFactors = {
    retrieval_quality: retrievalQualityFactor(args.chunks),
    grounding_coverage: Math.max(0, Math.min(1, args.grounding.coverage)),
    prior_use: priorUseFactor(args.chunks),
    consistency: consistencyFactor(args.generated.answer, args.consistencyAnswer),
    intent_fit: intentFitFactor(args.intent),
    model_self_confidence: calibratedSelfConfidence(args.generated.declaredConfidence),
    hard_rule_clean: hardRuleClean(args.grounding),
  };

  // Suma ponderada (sin hard_rule_clean — actúa como floor abajo).
  let raw = 0;
  for (const k of Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>) {
    raw += factors[k] * WEIGHTS[k];
  }
  raw = Math.max(0, Math.min(1, raw));

  // ----- Hard overrides -----
  let hardOverride: ScoredOutcome["hardOverride"] = null;
  let final = raw;
  let reason = humanReason({
    factors,
    chunks: args.chunks,
    intent: args.intent,
    grounding: args.grounding,
    generated: args.generated,
  });

  if (args.intent.mustEscalate) {
    final = 0;
    hardOverride = "must_escalate";
    reason = args.intent.triggeredRule
      ? `Necesita pasar por vos: detecté "${args.intent.triggeredRule}".`
      : "Necesita pasar por vos antes de responder.";
  } else if (args.intent.isOutOfScope) {
    final = 0;
    hardOverride = "out_of_scope";
    reason = "Esta pregunta está fuera de lo que sabés contestar todavía.";
  } else if (factors.hard_rule_clean === 0) {
    // Floor: nunca arriba del umbral suggest si hay violación.
    final = Math.min(final, args.thresholds.suggest - 0.01);
    hardOverride = "hard_rule";
    if (args.grounding.hardRuleHits.length) {
      reason = `Mencionaba "${args.grounding.hardRuleHits[0]}" y eso lo marcaste como "nunca prometer".`;
    } else if (args.grounding.fabricatedSpecifics.length) {
      reason = `La IA inventó "${args.grounding.fabricatedSpecifics[0]}", eso no está en tu memoria. Mejor revisar.`;
    } else {
      reason = "La respuesta no está bien apoyada en tu conocimiento. Mejor que la veas.";
    }
  }

  // Fuera de horario (no es override total, sólo degrada verde→ámbar).
  if (args.outsideHours && !args.intent.isGreeting && !hardOverride) {
    if (final >= args.thresholds.auto) {
      final = Math.min(final, args.thresholds.auto - 0.01);
      reason = "Fuera de horario — preferimos que la veas vos antes de mandarla.";
    }
  }

  // Shadow mode no toca el score (la decisión de no-enviar la toma el
  // pipeline al ver `shadow_mode = true`); el reason no se altera.

  const semaphore = computeSemaphore(final, args.thresholds);
  return {
    factors,
    rawConfidence: raw,
    finalConfidence: final,
    semaphore,
    reason,
    hardOverride,
  };
}

function computeSemaphore(
  conf: number,
  thresholds: { auto: number; suggest: number },
): Semaphore {
  if (conf >= thresholds.auto) return "green";
  if (conf >= thresholds.suggest) return "amber";
  return "red";
}

// =========================================================================
// Reason builder (frase humana, una línea, sin jerga).
// =========================================================================
function humanReason(args: {
  factors: ScoringFactors;
  chunks: RetrievedChunk[];
  intent: ClassifyResult;
  grounding: GroundingResult;
  generated: GeneratedAnswer;
}): string {
  const top = args.chunks[0];
  const usesTop = top?.usage_count ?? 0;

  if (args.intent.isGreeting) {
    return "Saludo — respuesta corta, segura.";
  }

  if (args.factors.grounding_coverage >= 0.7 && usesTop >= 5) {
    return `Ya respondí ${usesTop} veces parecido — es respuesta segura.`;
  }
  if (args.factors.grounding_coverage >= 0.7) {
    return "Respuesta apoyada en tu base de conocimiento.";
  }
  if (args.chunks.length === 0) {
    return "Primera vez que veo algo así — revisá antes de enviar.";
  }
  if (args.factors.grounding_coverage < 0.4) {
    return "La respuesta usa cosas que no están del todo en tu memoria. Revisá.";
  }
  return "Tengo una idea pero no estoy 100% segura. Revisá.";
}
