// Generación de respuesta con structured output. El modelo recibe:
//   - identidad de la org (nombre, tagline, tono, idioma, never_promise)
//   - intención clasificada
//   - fragmentos recuperados (citables por id)
//   - mensaje del cliente
// Devuelve respuesta + ids citados + confianza declarada + flag de
// menciones a precios/horarios (lo necesita grounding para chequear).

import { generateText, Output } from "ai";
import { z } from "zod";
import type { Row } from "@/lib/supabase/types";
import { resolveLanguageModel, generationDefaults } from "./providers";
import { computeCost, estimateTokens, usageToTokens } from "./pricing";
import { recordTrace } from "./trace";
import type {
  ClassifyResult,
  GeneratedAnswer,
  ProviderRow,
  RetrievedChunk,
  RunCtx,
} from "./types";

type Org = Row<"textos_orgs">;

const SCHEMA = z.object({
  answer: z
    .string()
    .min(1)
    .max(2000)
    .describe(
      "La respuesta al cliente. Tono natural, breve, en el idioma del cliente. NO inventes precios, horarios, direcciones ni promesas si no aparecen en los fragmentos.",
    ),
  citedCardIds: z
    .array(z.string())
    .describe("Ids de las tarjetas de conocimiento usadas. Vacío si no usaste ninguna."),
  declaredConfidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Tu propia estimación de qué tan correcta es la respuesta, 0..1."),
  mentionsPriceOrSchedule: z
    .boolean()
    .describe("True si la respuesta menciona algún precio, horario, dirección o número específico."),
});

function buildSystem(org: Org, intent: ClassifyResult): string {
  const tone = org.tone || "casual";
  const lang =
    intent.language === "es"
      ? "castellano rioplatense, natural, sin formalismos."
      : intent.language === "en"
        ? "natural English, friendly."
        : intent.language === "pt"
          ? "português conversacional."
          : "el idioma del cliente.";
  const never = (org.never_promise ?? []).filter(Boolean);
  const escalate = (org.must_escalate ?? []).filter(Boolean);

  return `Sos el asistente de "${org.name}"${org.tagline ? ` — ${org.tagline}` : ""}.
Hablás en ${lang}
Tono: ${tone}.

Reglas duras:
- NUNCA inventes precios, horarios, direcciones, números de teléfono ni nombres si no aparecen literalmente en los Fragmentos.
- NUNCA prometas: ${never.length ? never.join(" / ") : "(no hay reglas explícitas)"}
- Si lo que el cliente pide cae en alguno de estos patrones, decí amablemente que va a pasar al equipo: ${escalate.length ? escalate.join(" / ") : "(no hay)"}
- Sé breve. 1–3 oraciones es ideal. Una sola si alcanza.
- Citá las tarjetas que usaste por id en \`citedCardIds\`. Si no usaste ninguna porque la pregunta es trivial o saludo, dejá el array vacío y declará confidence baja.`;
}

function buildUser(body: string, chunks: RetrievedChunk[]): string {
  const ctx = chunks
    .slice(0, 5)
    .map(
      (c, i) =>
        `[Fragmento ${i + 1} | id=${c.card_id} | score=${c.combined_score.toFixed(2)}]\n${c.chunk_text}`,
    )
    .join("\n\n");

  return `Mensaje del cliente:
"${body.slice(0, 2000)}"

Fragmentos disponibles de tu memoria:
${ctx || "(no hay fragmentos relevantes — respondé sólo si es saludo o algo muy obvio; si no, declará baja confianza)"}`.trim();
}

export async function generateAnswer(
  org: Org,
  body: string,
  intent: ClassifyResult,
  chunks: RetrievedChunk[],
  provider: ProviderRow,
  ctx: RunCtx,
): Promise<GeneratedAnswer | null> {
  const system = buildSystem(org, intent);
  const user = buildUser(body, chunks);
  const defaults = generationDefaults(provider);

  const started = Date.now();
  try {
    const { output, usage } = await generateText({
      model: resolveLanguageModel(provider),
      output: Output.object({ schema: SCHEMA }),
      system,
      prompt: user,
      temperature: defaults.temperature,
      maxOutputTokens: defaults.maxOutputTokens,
    });
    const latencyMs = Date.now() - started;
    const tok = usageToTokens(usage, estimateTokens(system + user));
    await recordTrace({
      ctx,
      kind: "generate",
      provider,
      latencyMs,
      inputTokens: tok.inputTokens,
      outputTokens: tok.outputTokens,
      costUsd: computeCost(provider, tok),
    });
    return output as GeneratedAnswer;
  } catch (err) {
    await recordTrace({
      ctx,
      kind: "generate",
      provider,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
    // Un retry rápido con prompt más estricto para errores de JSON malformado.
    try {
      const retryStarted = Date.now();
      const { output, usage } = await generateText({
        model: resolveLanguageModel(provider),
        output: Output.object({ schema: SCHEMA }),
        system: system + "\n\nIMPORTANTE: el JSON debe ser estrictamente válido.",
        prompt: user,
        temperature: 0,
        maxOutputTokens: defaults.maxOutputTokens,
      });
      const latencyMs = Date.now() - retryStarted;
      const tok = usageToTokens(usage, estimateTokens(system + user));
      await recordTrace({
        ctx,
        kind: "generate",
        provider,
        latencyMs,
        inputTokens: tok.inputTokens,
        outputTokens: tok.outputTokens,
        costUsd: computeCost(provider, tok),
      });
      return output as GeneratedAnswer;
    } catch (err2) {
      await recordTrace({
        ctx,
        kind: "generate",
        provider,
        latencyMs: Date.now() - started,
        error: err2 instanceof Error ? err2.message : String(err2),
      });
      return null;
    }
  }
}

/** Segunda pasada con temperature 0 para estimar consistencia (texto-a-texto).
 *  No es structured output — sólo queremos comparar el cuerpo de la respuesta. */
export async function generateAnswerForConsistencyCheck(
  org: Org,
  body: string,
  intent: ClassifyResult,
  chunks: RetrievedChunk[],
  provider: ProviderRow,
  ctx: RunCtx,
): Promise<string | null> {
  const system = buildSystem(org, intent);
  const user = buildUser(body, chunks) +
    "\n\nDevolvé sólo el cuerpo de la respuesta como JSON con la clave `answer`.";
  const started = Date.now();
  try {
    const { output, usage } = await generateText({
      model: resolveLanguageModel(provider),
      output: Output.object({ schema: z.object({ answer: z.string() }) }),
      system,
      prompt: user,
      temperature: 0,
      maxOutputTokens: Math.min(generationDefaults(provider).maxOutputTokens, 280),
    });
    const latencyMs = Date.now() - started;
    const tok = usageToTokens(usage, estimateTokens(system + user));
    await recordTrace({
      ctx,
      kind: "generate",
      provider,
      latencyMs,
      inputTokens: tok.inputTokens,
      outputTokens: tok.outputTokens,
      costUsd: computeCost(provider, tok),
    });
    return (output as { answer: string }).answer;
  } catch (err) {
    await recordTrace({
      ctx,
      kind: "generate",
      provider,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
