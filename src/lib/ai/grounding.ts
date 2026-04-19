// Grounding: chequea independientemente del modelo si la respuesta está
// soportada por los fragmentos recuperados. Es heurístico (no LLM) para
// no encarecer y mantener latencia. Combina:
//  - Cobertura por oración: cada oración aporta a `coverage` si su token
//    set tiene overlap >= 30% con algún fragmento.
//  - Hard rules: matchea never_promise contra la respuesta.
//  - Specifics inventados: precios/horarios que aparecen en la respuesta
//    pero no en ningún fragmento ni en el mensaje del cliente.

import type { GroundingResult, RetrievedChunk } from "./types";
import { findSpecifics, splitSentences, tokenSet } from "./text-utils";
import type { Row } from "@/lib/supabase/types";

type Org = Pick<Row<"textos_orgs">, "never_promise">;

const SUPPORT_THRESHOLD = 0.3;

export function checkGrounding(
  answer: string,
  chunks: RetrievedChunk[],
  inboundBody: string,
  org: Org,
): GroundingResult {
  const sentences = splitSentences(answer);
  if (sentences.length === 0) {
    return { coverage: 0, hardRuleHits: [], fabricatedSpecifics: [] };
  }

  const chunkTokenSets = chunks.map((c) => tokenSet(c.chunk_text));
  let supported = 0;
  for (const s of sentences) {
    const sTokens = tokenSet(s);
    if (sTokens.size === 0) {
      // Frases sin tokens significativos (saludos, "OK") cuentan como
      // soportadas para no penalizar respuestas muy cortas.
      supported += 1;
      continue;
    }
    let bestOverlap = 0;
    for (const ct of chunkTokenSets) {
      let inter = 0;
      for (const t of sTokens) if (ct.has(t)) inter++;
      const overlap = inter / sTokens.size;
      if (overlap > bestOverlap) bestOverlap = overlap;
    }
    if (bestOverlap >= SUPPORT_THRESHOLD) supported += 1;
  }
  const coverage = supported / sentences.length;

  // Hard rules: never_promise. Si el texto contiene cualquier palabra
  // significativa de una regla, lo flagueamos.
  const lowerAnswer = answer.toLowerCase();
  const hardRuleHits: string[] = [];
  for (const rule of org.never_promise ?? []) {
    if (!rule) continue;
    const tokens = rule.toLowerCase().split(/\s+/).filter((t) => t.length >= 4);
    if (tokens.length === 0) continue;
    if (tokens.every((t) => lowerAnswer.includes(t))) {
      hardRuleHits.push(rule);
    }
  }

  // Specifics inventados: precios/horarios en la respuesta que NO están en
  // ningún fragmento ni en el mensaje del cliente.
  const answerSpecifics = findSpecifics(answer);
  const allowedHaystack = chunks.map((c) => c.chunk_text.toLowerCase()).join(" \n ") + " " + inboundBody.toLowerCase();
  const fabricatedSpecifics = answerSpecifics.filter((s) => !allowedHaystack.includes(s.toLowerCase()));

  return { coverage, hardRuleHits, fabricatedSpecifics };
}
