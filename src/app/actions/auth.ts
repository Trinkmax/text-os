"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSbServer } from "@/lib/supabase/server";
import { clearCurrentOrgId, setCurrentOrgId } from "@/lib/org";

const credSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type ActionResult = { ok: true; redirect?: string } | { ok: false; error: string };

export async function signInAction(formData: FormData): Promise<ActionResult> {
  const parsed = credSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const sb = await createSbServer();
  const { error } = await sb.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: mapAuthError(error.message) };

  const next = (formData.get("redirect") as string) || "/";
  return { ok: true, redirect: next };
}

export async function signUpAction(formData: FormData): Promise<ActionResult> {
  const parsed = credSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const sb = await createSbServer();
  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };

  // Un trigger en auth.users auto-confirma el email, así que aunque Supabase
  // no devuelva sesión en signUp (hay configs donde pasa), podemos loguear
  // de una con la misma credencial.
  if (!data.session) {
    const { error: loginError } = await sb.auth.signInWithPassword(parsed.data);
    if (loginError) {
      return {
        ok: true,
        redirect: `/login?pending=${encodeURIComponent(parsed.data.email)}`,
      };
    }
  }

  return { ok: true, redirect: "/onboarding" };
}

export async function signOutAction() {
  const sb = await createSbServer();
  await sb.auth.signOut();
  await clearCurrentOrgId();
  redirect("/login");
}

export async function switchOrgAction(orgId: string) {
  const sb = await createSbServer();
  const { data: member } = await sb
    .from("textos_org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .maybeSingle();
  if (!member) return { ok: false, error: "No sos miembro de esa organización" };
  await setCurrentOrgId(orgId);
  revalidatePath("/", "layout");
  return { ok: true };
}

function mapAuthError(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "Email o contraseña incorrectos.";
  if (/user already registered/i.test(msg)) return "Ya existe una cuenta con ese email.";
  if (/password/i.test(msg) && /weak/i.test(msg)) return "Contraseña demasiado débil.";
  return msg;
}
