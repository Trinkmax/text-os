// Clasificador de intención + detector de "must escalate" / "out of scope".
// Hace dos chequeos antes de llamar al modelo:
//  1. Match literal contra `must_escalate` (substring case-insensitive) →
//     marca y vuelve sin llamar al LLM.
//  2. Mensaje saludo-only ("hola", "hey", "buen día") → short-circuit.
// Si ninguno aplica, llamamos al modelo de classification con structured output.

import { generateText, Output } from "ai";
import { z } from "zod";
import type { Row } from "@/lib/supabase/types";
import { resolveLanguageModel } from "./providers";
import { computeCost, estimateTokens, usageToTokens } from "./pricing";
import { recordTrace } from "./trace";
import type { ClassifyResult, ProviderRow, RunCtx } from "./types";

type Org = Row<"textos_orgs">;

const GREETING_RE = /^\s*(hola+|hey+|buenas|buen[oa]s? d[ií]as|buenas? tardes|buen[oa]s? noches|hi+|hello|holiii?|holaa+|gracias|saludos)[\s!\.\?¡¿]*$/i;

const SCHEMA = z.object({
  intent: z
    .enum([
      "horarios",
      "precios",
      "ubicacion",
      "agendar_turno",
      "pregunta_servicio",
      "queja",
      "saludo",
      "agradecimiento",
      "otro",
    ])
    .describe("Categoría del pedido del cliente."),
  language: z.enum(["es", "en", "pt", "otro"]).describe("Idioma detectado del mensaje."),
  isGreeting: z.boolean().describe("True si es sólo un saludo o agradecimiento."),
  isOutOfScope: z
    .boolean()
    .describe(
      "True si el mensaje pide algo que NO encaja con lo que la organización ofrece, dado el resumen del negocio.",
    ),
  mustEscalate: z
    .boolean()
    .describe(
      "True si el mensaje cae en alguno de los patrones de must_escalate provistos por la org.",
    ),
  triggeredRule: z
    .string()
    .nullable()
    .describe("Si se gatilló una regla, el texto literal de la regla. Si no, null."),
  summary: z.string().max(160).describe("Una frase resumen del pedido del cliente."),
});

export async function classifyMessage(
  org: Org,
  body: string,
  classifyProvider: ProviderRow,
  ctx: RunCtx,
): Promise<ClassifyResult> {
  // 1. Pre-check rules locales — más rápido y barato que un LLM.
  const local = preCheckLocalRules(org, body);
  if (local) return local;

  // 2. LLM con structured output.
  const started = Date.now();
  try {
    const model = resolveLanguageModel(classifyProvider);
    const system = `Sos un clasificador para un CRM. La organización es:
"${org.name}"${org.tagline ? ` — ${org.tagline}` : ""}${org.industry ? ` (sector: ${org.industry})` : ""}.

Reglas duras:
- must_escalate (siempre humano): ${org.must_escalate?.join(" | ") || "(ninguna)"}
- never_promise (no prometer): ${org.never_promise?.join(" | ") || "(ninguna)"}

Tu trabajo es categorizar el mensaje del cliente. NO redactes respuesta.`;

    const { output, usage } = await generateText({
      model,
      output: Output.object({ schema: SCHEMA }),
      system,
      prompt: `Mensaje del cliente:\n"${body.slice(0, 2000)}"`,
      temperature: 0,
      maxOutputTokens: 240,
    });

    const latencyMs = Date.now() - started;
    const tok = usageToTokens(usage, estimateTokens(system + body));
    await recordTrace({
      ctx,
      kind: "classify",
      provider: classifyProvider,
      latencyMs,
      inputTokens: tok.inputTokens,
      outputTokens: tok.outputTokens,
      costUsd: computeCost(classifyProvider, tok),
    });

    return output as ClassifyResult;
  } catch (err) {
    await recordTrace({
      ctx,
      kind: "classify",
      provider: classifyProvider,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
    // Fallback: tratamos como "otro", sin escalate, sin out-of-scope.
    // El generador igual va a intentar contestar; el grounding va a pisar.
    return {
      intent: "otro",
      language: "es",
      isGreeting: false,
      isOutOfScope: false,
      mustEscalate: false,
      triggeredRule: null,
      summary: body.slice(0, 160),
    };
  }
}

function preCheckLocalRules(org: Org, body: string): ClassifyResult | null {
  const lower = body.toLowerCase();
  // must_escalate: substring match.
  for (const rule of org.must_escalate ?? []) {
    if (!rule) continue;
    const tokens = rule.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
    if (tokens.length && tokens.every((t) => lower.includes(t))) {
      return {
        intent: "otro",
        language: "es",
        isGreeting: false,
        isOutOfScope: false,
        mustEscalate: true,
        triggeredRule: rule,
        summary: body.slice(0, 160),
      };
    }
  }
  // Saludo limpio.
  if (GREETING_RE.test(body)) {
    return {
      intent: "saludo",
      language: "es",
      isGreeting: true,
      isOutOfScope: false,
      mustEscalate: false,
      triggeredRule: null,
      summary: "Saludo",
    };
  }
  return null;
}
