"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSbServer } from "@/lib/supabase/server";
import { setCurrentOrgId, clearCurrentOrgId, requireOrgId } from "@/lib/org";
import { DEMO_DATA, type DemoIndustry } from "@/lib/demo-seed";

type OnboardingPayload = {
  ownerName: string;
  orgName: string;
  tagline: string;
  industry: string;
  logoUrl?: string | null;
  topQuestions: string[];
  answers: Record<string, string>;
  neverPromise: string[];
  mustEscalate: string[];
  sampleMessages: string[];
  languages: string[];
  businessHours: Record<string, { open: string; close: string; active: boolean }>;
  tone: string;
  channelsToConnect: string[];
};

async function requireUser() {
  const sb = await createSbServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { sb, user };
}

export async function completeOnboarding(payload: OnboardingPayload) {
  const { sb } = await requireUser();

  const { data: org, error } = await sb
    .from("textos_orgs")
    .insert({
      name: payload.orgName || "Mi negocio",
      logo_url: payload.logoUrl || null,
      industry: payload.industry,
      owner_display_name: payload.ownerName,
      tagline: payload.tagline,
      tone: payload.tone,
      languages: payload.languages.length ? payload.languages : ["es"],
      never_promise: payload.neverPromise,
      must_escalate: payload.mustEscalate,
      business_hours: payload.businessHours,
      onboarding_completed: true,
      onboarding_data: payload as never,
      coverage_estimate: estimateCoverage(payload),
    })
    .select("id")
    .single();

  if (error || !org) throw new Error(error?.message || "No se pudo crear la organización");

  await setCurrentOrgId(org.id);

  // Knowledge cards from onboarding
  const cards = payload.topQuestions
    .map((q) => q.trim())
    .filter(Boolean)
    .map((q) => ({
      org_id: org.id,
      topic: inferTopic(q),
      question: q,
      answer: payload.answers[q] || "",
      variants: [] as string[],
      origin: "onboarding" as const,
      confidence: payload.answers[q] ? 0.75 : 0.35,
      needs_review: !payload.answers[q],
    }));
  if (cards.length) await sb.from("textos_knowledge_cards").insert(cards);

  if (payload.channelsToConnect.length) {
    await sb.from("textos_channels").insert(
      payload.channelsToConnect.map((type) => ({
        org_id: org.id,
        type: type as never,
        status: "pending" as const,
      })),
    );
  }

  await sb.from("textos_stages").insert([
    { org_id: org.id, name: "Nuevo lead", color: "#64748B", position: 0 },
    { org_id: org.id, name: "En conversación", color: "#3B82F6", position: 1 },
    { org_id: org.id, name: "Propuesta", color: "#F59E0B", position: 2 },
    { org_id: org.id, name: "Cliente", color: "#10B981", position: 3 },
  ]);

  revalidatePath("/", "layout");
  return { ok: true, orgId: org.id };
}

function estimateCoverage(p: OnboardingPayload) {
  let score = 0;
  score += Math.min(p.topQuestions.filter((q) => q.trim()).length, 5) * 10;
  score += Math.min(Object.values(p.answers).filter((a) => a.trim().length > 10).length, 5) * 6;
  score += Math.min(p.neverPromise.length, 3) * 3;
  score += Math.min(p.mustEscalate.length, 3) * 3;
  if (p.sampleMessages.filter((m) => m.trim().length > 5).length >= 3) score += 8;
  if (p.channelsToConnect.length) score += 4;
  return Math.min(Math.round(score), 92);
}

function inferTopic(q: string) {
  const lower = q.toLowerCase();
  if (/hora|abren|cierran|atienden/.test(lower)) return "Horarios";
  if (/precio|cuánto|costo|sale/.test(lower)) return "Precios";
  if (/turno|cita|disponible/.test(lower)) return "Turnos";
  if (/dónde|direcci/.test(lower)) return "Ubicación";
  if (/envío|enviar|llega/.test(lower)) return "Envíos";
  if (/cambio|devol/.test(lower)) return "Cambios y devoluciones";
  if (/pago|tarjeta|efectivo/.test(lower)) return "Formas de pago";
  return "General";
}

export async function seedDemo(industry: DemoIndustry) {
  const { sb } = await requireUser();
  const d = DEMO_DATA[industry];

  const { data: org, error } = await sb
    .from("textos_orgs")
    .insert({
      name: d.orgName,
      tagline: d.tagline,
      industry,
      tone: "casual",
      demo: true,
      onboarding_completed: true,
      never_promise: d.neverPromise,
      must_escalate: d.mustEscalate,
      coverage_estimate: 74,
      languages: ["es"],
    })
    .select("id")
    .single();

  if (error || !org) throw new Error(error?.message || "No se pudo crear demo");
  await setCurrentOrgId(org.id);

  await sb.from("textos_stages").insert(
    d.stages.map((s, i) => ({ org_id: org.id, name: s.name, color: s.color, position: i })),
  );
  await sb.from("textos_tag_catalog").insert(
    d.tags.map((t) => ({ org_id: org.id, name: t.name, color: t.color })),
  );
  await sb.from("textos_knowledge_cards").insert(
    d.knowledge.map((k) => ({
      org_id: org.id,
      topic: k.topic,
      question: k.question,
      answer: k.answer,
      variants: k.variants || [],
      confidence: k.confidence,
      origin: "onboarding" as const,
      usage_count: Math.floor(Math.random() * 40) + 5,
    })),
  );

  await sb.from("textos_scope_gaps").insert([
    { org_id: org.id, topic: "Productos recomendados", sample_question: "Qué crema me recomendó el barbero?", count: 3 },
    { org_id: org.id, topic: "Combos promocionales", sample_question: "Hay paquetes corte + barba?", count: 2 },
    { org_id: org.id, topic: "Gift card", sample_question: "Venden gift card para regalar?", count: 1 },
  ]);

  for (const conv of d.conversations) {
    const { data: contact } = await sb
      .from("textos_contacts")
      .insert({
        org_id: org.id,
        name: conv.contact_name,
        channel: conv.channel,
        stage: conv.stage,
        tags: conv.tags,
        value: Math.floor(Math.random() * 120000) + 5000,
        source: conv.channel,
        last_interaction_at: new Date(Date.now() - conv.messages[0].minsAgo * 60000).toISOString(),
      })
      .select("id")
      .single();
    if (!contact) continue;

    const { data: conversation } = await sb
      .from("textos_conversations")
      .insert({
        org_id: org.id,
        contact_id: contact.id,
        channel: conv.channel,
        last_message: conv.messages[conv.messages.length - 1].body,
        last_message_at: new Date(Date.now() - conv.messages[conv.messages.length - 1].minsAgo * 60000).toISOString(),
        unread_count: conv.unread ?? 0,
        semaphore: conv.semaphore ?? "amber",
      })
      .select("id")
      .single();
    if (!conversation) continue;

    for (const m of conv.messages) {
      await sb.from("textos_messages").insert({
        org_id: org.id,
        conversation_id: conversation.id,
        direction: m.direction,
        author: m.author ?? (m.direction === "in" ? "contact" : "human"),
        body: m.body,
        created_at: new Date(Date.now() - m.minsAgo * 60000).toISOString(),
      });
    }

    if (conv.suggestion) {
      const lastInbound = [...conv.messages].reverse().find((m) => m.direction === "in");
      await sb.from("textos_suggestions").insert({
        org_id: org.id,
        conversation_id: conversation.id,
        proposed_text: conv.suggestion.proposed,
        confidence: conv.suggestion.confidence,
        semaphore:
          conv.suggestion.confidence >= 0.85
            ? "green"
            : conv.suggestion.confidence >= 0.5
              ? "amber"
              : "red",
        reason:
          conv.suggestion.reason ??
          (conv.suggestion.confidence >= 0.85
            ? "Alta coincidencia con respuestas previas."
            : conv.suggestion.confidence >= 0.5
              ? "Coincidencia parcial con respuestas previas."
              : "Fuera del alcance actual."),
        status: conv.semaphore === "green" ? "auto_sent" : "pending",
        created_at: new Date(Date.now() - (lastInbound?.minsAgo ?? 5) * 60000).toISOString(),
      });
    }
  }

  await sb.from("textos_quick_replies").insert([
    { org_id: org.id, shortcut: "horarios", body: "Abrimos de lunes a sábados de 10 a 20." },
    { org_id: org.id, shortcut: "direccion", body: "Estamos en Thames 1850, Palermo." },
    { org_id: org.id, shortcut: "cancelar", body: "Perfecto, cancelo tu turno. Si querés reagendar, avisame cuándo." },
  ]);

  revalidatePath("/", "layout");
  return { ok: true, orgId: org.id };
}

export async function leaveCurrentOrg() {
  const orgId = await requireOrgId();
  const { sb, user } = await requireUser();
  await sb
    .from("textos_org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", user.id);
  await clearCurrentOrgId();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function resetDemoSession() {
  await clearCurrentOrgId();
  revalidatePath("/", "layout");
}
