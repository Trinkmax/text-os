// Orquestador del pipeline de sugerencias.
// Entry point: `runSuggestionPipeline({ orgId, messageId, conversationId, body })`.
// Garantías:
//   - Idempotente por message_id (lock en textos_message_processing).
//   - Una sola fila en textos_suggestions por mensaje.
//   - Trazas y run con factor breakdown siempre se persisten, incluso al fallar.
//   - Nunca tira error al caller — los webhooks no se rompen por la IA.

import { after } from "next/server";
import { createSbService } from "@/lib/channels/service";
import { sendMessageViaChannel } from "@/lib/channels/send";
import type { Json, Row } from "@/lib/supabase/types";
import { getActiveProviderRow } from "./providers";
import { classifyMessage } from "./classify";
import { retrieveContext } from "./retrieval";
import { generateAnswer, generateAnswerForConsistencyCheck } from "./generate";
import { checkGrounding } from "./grounding";
import { combineFactors } from "./scoring";
import { evaluateBusinessHours } from "./business-hours";
import { claimMessage, releaseMessage } from "./run-once";
import { checkAndIncrementRate } from "./trace";
import { reasonFromError } from "./errors";
import type { RunCtx } from "./types";

type Org = Row<"textos_orgs">;

export type PipelineInput = {
  orgId: string;
  messageId: string;
  conversationId: string;
  channelId: string | null;
  body: string;
};

export async function runSuggestionPipeline(input: PipelineInput): Promise<void> {
  // 1. Lock idempotente.
  const claim = await claimMessage(input.orgId, input.messageId);
  if (!claim.ok) return; // ya procesado o error de claim — silencio absoluto.

  const sb = createSbService();

  // 2. Crear el run (fila de auditoría / Realtime).
  const { data: runRow } = await sb
    .from("textos_ai_runs")
    .insert({ org_id: input.orgId, message_id: input.messageId })
    .select("id")
    .single();
  if (!runRow) {
    await releaseMessage(input.messageId, "failed", "no_run");
    return;
  }
  const ctx: RunCtx = { orgId: input.orgId, runId: runRow.id, suggestionId: null };

  try {
    await runInner(input, ctx);
  } catch (err) {
    // Garantizamos que siempre cerramos el run + el lock.
    await sb
      .from("textos_ai_runs")
      .update({
        status: "failed",
        ended_at: new Date().toISOString(),
        error: (err instanceof Error ? err.message : String(err)).slice(0, 400),
      })
      .eq("id", runRow.id);
    await releaseMessage(input.messageId, "failed", "exception");
  }
}

async function runInner(input: PipelineInput, ctx: RunCtx): Promise<void> {
  const sb = createSbService();
  const startedAt = Date.now();

  // 3. Rate limit (por org, ventana móvil de 60s).
  const okRate = await checkAndIncrementRate(input.orgId);
  if (!okRate) {
    await persistSkippedRun(ctx, "rate_limited", "Demasiados mensajes en simultáneo — esperá un toque.");
    await releaseMessage(input.messageId, "skipped", "rate_limited");
    return;
  }

  // 4. Cargar la org (settings, thresholds, business hours, never_promise…).
  const { data: org } = await sb
    .from("textos_orgs")
    .select("*")
    .eq("id", input.orgId)
    .single();
  if (!org) {
    await persistSkippedRun(ctx, "no_org", "Organización no encontrada.");
    await releaseMessage(input.messageId, "skipped", "no_org");
    return;
  }

  // 5. Provider de generación. Sin esto, no producimos sugerencia (la UI
  //    muestra el empty state accionable).
  const generationProvider = await getActiveProviderRow(input.orgId, "generation");
  if (!generationProvider) {
    await persistSkippedRun(
      ctx,
      "no_generation_provider",
      "Conectá un modelo en Ajustes para que empiece a proponerte respuestas.",
    );
    await releaseMessage(input.messageId, "skipped", "no_generation_provider");
    return;
  }

  // 6. Clasificar (LLM o pre-checks locales).
  const classifyProvider = (await getActiveProviderRow(input.orgId, "classification")) ?? generationProvider;
  const intent = await classifyMessage(org as Org, input.body, classifyProvider, ctx);

  // 7. Si el clasificador dice must_escalate u out_of_scope, no llamamos
  //    al generador — escalamos directo en rojo.
  if (intent.mustEscalate || intent.isOutOfScope) {
    const reason = intent.mustEscalate
      ? intent.triggeredRule
        ? `Necesita pasar por vos: detecté "${intent.triggeredRule}".`
        : "Necesita pasar por vos antes de responder."
      : "Esta pregunta está fuera de lo que sabés contestar todavía.";
    const sug = await persistSuggestion(input, ctx, {
      proposed_text: null,
      confidence: 0,
      semaphore: "red",
      reason,
    });
    await persistRun(ctx, {
      status: "done",
      semaphore: "red",
      confidence: 0,
      factors: { intent } as unknown as Json,
      reason,
      suggestionId: sug?.id ?? null,
      latencyMs: Date.now() - startedAt,
    });
    await releaseMessage(input.messageId, "done");
    return;
  }

  // 8. Recuperación híbrida.
  const retrieval = await retrieveContext(input.orgId, input.body, ctx);

  // 9. Generación (1ª pasada con structured output).
  const generated = await generateAnswer(org as Org, input.body, intent, retrieval.chunks, generationProvider, ctx);
  if (!generated) {
    const reason = "No pude redactar una respuesta esta vez. Mejor pasala vos.";
    const sug = await persistSuggestion(input, ctx, {
      proposed_text: null,
      confidence: 0,
      semaphore: "red",
      reason,
    });
    await persistRun(ctx, {
      status: "failed",
      semaphore: "red",
      confidence: 0,
      factors: { error: "generation_failed" } as Json,
      reason,
      suggestionId: sug?.id ?? null,
      latencyMs: Date.now() - startedAt,
    });
    await releaseMessage(input.messageId, "failed", "generation_failed");
    return;
  }

  // 10. Consistencia: 2ª pasada a temperatura 0 (best-effort, no bloquea).
  const consistencyAnswer = await generateAnswerForConsistencyCheck(
    org as Org,
    input.body,
    intent,
    retrieval.chunks,
    generationProvider,
    ctx,
  );

  // 11. Grounding heurístico independiente.
  const grounding = checkGrounding(generated.answer, retrieval.chunks, input.body, org as Org);

  // 12. Fuera de horario.
  const bh = evaluateBusinessHours(org.business_hours, org.timezone || "America/Argentina/Buenos_Aires");

  // 13. Combinar.
  const scored = combineFactors({
    chunks: retrieval.chunks,
    intent,
    generated,
    consistencyAnswer,
    grounding,
    thresholds: { auto: org.threshold_auto ?? 0.85, suggest: org.threshold_suggest ?? 0.55 },
    shadowMode: org.shadow_mode ?? false,
    outsideHours: bh.configured && !bh.isOpen,
  });

  // 14. Persistir sugerencia.
  const sug = await persistSuggestion(input, ctx, {
    proposed_text: generated.answer,
    confidence: scored.finalConfidence,
    semaphore: scored.semaphore,
    reason: scored.reason,
  });

  // 15. Bump usage_count en las cards citadas (top-3 si el modelo no las
  //     declaró). Lo hacemos best-effort.
  const usedCardIds =
    generated.citedCardIds && generated.citedCardIds.length
      ? generated.citedCardIds
      : retrieval.chunks.slice(0, 1).map((c) => c.card_id);
  if (usedCardIds.length && (scored.semaphore === "green" || scored.semaphore === "amber")) {
    await bumpUsageCounts(input.orgId, usedCardIds);
  }

  // 16. Auto-envío si verde + no shadow + canal disponible.
  let autoSent = false;
  if (
    scored.semaphore === "green" &&
    !(org.shadow_mode ?? false) &&
    sug?.id &&
    input.channelId
  ) {
    autoSent = await tryAutoSend({
      orgId: input.orgId,
      conversationId: input.conversationId,
      channelId: input.channelId,
      body: generated.answer,
      suggestionId: sug.id,
    });
  }

  // 17. Cerrar el run con factores serializados.
  await persistRun(ctx, {
    status: "done",
    semaphore: scored.semaphore,
    confidence: scored.finalConfidence,
    factors: {
      ...scored.factors,
      retrieval: {
        chunks: retrieval.chunks.length,
        topScore: retrieval.chunks[0]?.combined_score ?? 0,
        cardIds: retrieval.chunks.slice(0, 5).map((c) => c.card_id),
      },
      grounding,
      raw: scored.rawConfidence,
      hardOverride: scored.hardOverride,
      outsideHours: bh.configured && !bh.isOpen,
      autoSent,
    } as unknown as Json,
    reason: scored.reason,
    suggestionId: sug?.id ?? null,
    latencyMs: Date.now() - startedAt,
  });
  await releaseMessage(input.messageId, "done");
}

// =========================================================================
// Helpers de persistencia
// =========================================================================

async function persistSuggestion(
  input: PipelineInput,
  ctx: RunCtx,
  data: {
    proposed_text: string | null;
    confidence: number;
    semaphore: "green" | "amber" | "red";
    reason: string;
  },
) {
  const sb = createSbService();
  const { data: sug } = await sb
    .from("textos_suggestions")
    .insert({
      org_id: input.orgId,
      conversation_id: input.conversationId,
      message_id: input.messageId,
      proposed_text: data.proposed_text,
      confidence: data.confidence,
      semaphore: data.semaphore,
      reason: data.reason,
      status: "pending",
    })
    .select("id")
    .single();
  if (sug?.id) {
    ctx.suggestionId = sug.id;
    // Linkear el run con la suggestion para que el dashboard cruce datos.
    await sb
      .from("textos_ai_runs")
      .update({ suggestion_id: sug.id })
      .eq("id", ctx.runId);
    // Linkear las trazas previas también (las que tenían suggestion_id null).
    await sb
      .from("textos_ai_traces")
      .update({ suggestion_id: sug.id })
      .eq("run_id", ctx.runId)
      .is("suggestion_id", null);
  }
  return sug;
}

async function persistRun(
  ctx: RunCtx,
  args: {
    status: "done" | "failed" | "skipped";
    semaphore: "green" | "amber" | "red" | null;
    confidence: number | null;
    factors: Json;
    reason: string;
    suggestionId: string | null;
    latencyMs: number;
  },
) {
  const sb = createSbService();
  await sb
    .from("textos_ai_runs")
    .update({
      status: args.status,
      semaphore: args.semaphore,
      confidence: args.confidence,
      factors: args.factors,
      reason: args.reason,
      suggestion_id: args.suggestionId,
      ended_at: new Date().toISOString(),
    })
    .eq("id", ctx.runId);
}

async function persistSkippedRun(ctx: RunCtx, reasonCode: string, humanReason: string) {
  const sb = createSbService();
  await sb
    .from("textos_ai_runs")
    .update({
      status: "skipped",
      reason: humanReason,
      factors: { skipped: reasonCode } as unknown as Json,
      ended_at: new Date().toISOString(),
    })
    .eq("id", ctx.runId);
}

async function bumpUsageCounts(orgId: string, cardIds: string[]) {
  const sb = createSbService();
  // Lectura + escritura en lugar de RPC: pocas filas, baja contención.
  const { data: rows } = await sb
    .from("textos_knowledge_cards")
    .select("id, usage_count")
    .eq("org_id", orgId)
    .in("id", cardIds);
  for (const r of rows ?? []) {
    await sb
      .from("textos_knowledge_cards")
      .update({ usage_count: (r.usage_count ?? 0) + 1 })
      .eq("id", r.id)
      .eq("org_id", orgId);
  }
}

async function tryAutoSend(args: {
  orgId: string;
  conversationId: string;
  channelId: string;
  body: string;
  suggestionId: string;
}): Promise<boolean> {
  const sb = createSbService();
  // Insertar mensaje out queued.
  const { data: msg } = await sb
    .from("textos_messages")
    .insert({
      org_id: args.orgId,
      conversation_id: args.conversationId,
      channel_id: args.channelId,
      direction: "out",
      author: "ai",
      body: args.body,
      delivery_status: "queued",
    })
    .select("id")
    .single();
  if (!msg?.id) return false;

  // Marcar la suggestion como auto_sent ANTES del network call para que
  // la UI (Realtime) la mueva al feed de autosends inmediatamente.
  await sb
    .from("textos_suggestions")
    .update({ status: "auto_sent", resolved_at: new Date().toISOString() })
    .eq("id", args.suggestionId)
    .eq("org_id", args.orgId);

  // Resolver el contact_id para el dispatch.
  const { data: conv } = await sb
    .from("textos_conversations")
    .select("contact_id")
    .eq("id", args.conversationId)
    .eq("org_id", args.orgId)
    .single();
  let toExternalId: string | null = null;
  if (conv?.contact_id) {
    const { data: contact } = await sb
      .from("textos_contacts")
      .select("external_id")
      .eq("id", conv.contact_id)
      .eq("org_id", args.orgId)
      .single();
    toExternalId = contact?.external_id ?? null;
  }

  if (toExternalId) {
    after(async () => {
      try {
        await sendMessageViaChannel({
          channelId: args.channelId,
          toExternalId,
          body: args.body,
          messageId: msg.id,
        });
      } catch {
        // El propio send ya escribe `delivery_status='failed'` con el error.
      }
    });
  }

  // Update last_message para el inbox clásico.
  await sb
    .from("textos_conversations")
    .update({
      last_message: args.body,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    })
    .eq("id", args.conversationId)
    .eq("org_id", args.orgId);

  return true;
}

// `reasonFromError` se exporta por su lado para que el wrapper de ingest
// pueda traducir errores no-pipeline (config rota, etc.).
export { reasonFromError };
