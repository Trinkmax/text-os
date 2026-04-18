"use server";

import { revalidatePath } from "next/cache";
import { createSbServer } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";

export async function saveAiSettings(input: {
  threshold_auto: number;
  threshold_suggest: number;
  shadow_mode: boolean;
  tone: string;
  never_promise?: string[];
  must_escalate?: string[];
}) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org");
  const sb = await createSbServer();
  await sb
    .from("textos_orgs")
    .update({
      threshold_auto: input.threshold_auto,
      threshold_suggest: input.threshold_suggest,
      shadow_mode: input.shadow_mode,
      tone: input.tone,
      ...(input.never_promise ? { never_promise: input.never_promise } : {}),
      ...(input.must_escalate ? { must_escalate: input.must_escalate } : {}),
    })
    .eq("id", orgId);
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function updateOrgProfile(input: { name: string; tagline?: string; logo_url?: string | null; timezone?: string }) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org");
  const sb = await createSbServer();
  await sb
    .from("textos_orgs")
    .update({
      name: input.name,
      ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
      ...(input.logo_url !== undefined ? { logo_url: input.logo_url } : {}),
      ...(input.timezone ? { timezone: input.timezone } : {}),
    })
    .eq("id", orgId);
  revalidatePath("/ajustes");
  revalidatePath("/", "layout");
  return { ok: true };
}
