"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSbServer } from "@/lib/supabase/server";
import { requireOrgId, requireAdminOrgId } from "@/lib/org";

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "agent", "readonly"]).default("agent"),
});

type Res<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export async function inviteMember(input: { email: string; role?: "admin" | "agent" | "readonly" }): Promise<Res<{ token: string }>> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const { data, error } = await sb
    .from("textos_org_invites")
    .insert({
      org_id: orgId,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      invited_by: user?.id ?? null,
    })
    .select("token")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya hay una invitación para ese email." };
    return { ok: false, error: error.message };
  }
  revalidatePath("/ajustes");
  return { ok: true, data: { token: data!.token } };
}

export async function revokeInvite(inviteId: string): Promise<Res> {
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();
  const { error } = await sb
    .from("textos_org_invites")
    .delete()
    .eq("id", inviteId)
    .eq("org_id", orgId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function changeMemberRole(userId: string, role: "admin" | "agent" | "readonly"): Promise<Res> {
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();
  const { error } = await sb
    .from("textos_org_members")
    .update({ role })
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<Res> {
  const orgId = await requireAdminOrgId();
  const sb = await createSbServer();

  // prevent removing the last admin
  const { data: admins } = await sb
    .from("textos_org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("role", "admin");
  if ((admins?.length ?? 0) <= 1 && admins?.[0]?.user_id === userId) {
    return { ok: false, error: "No podés quitar al único admin." };
  }

  const { error } = await sb
    .from("textos_org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function acceptInvite(token: string): Promise<Res<{ orgId: string }>> {
  const sb = await createSbServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Iniciá sesión antes de aceptar la invitación." };

  const { data, error } = await sb.rpc("textos_accept_invite" as never, { p_token: token } as never);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: { orgId: data as unknown as string } };
}

export async function listTeamData() {
  const orgId = await requireOrgId();
  const sb = await createSbServer();

  const [{ data: members }, { data: invites }] = await Promise.all([
    sb
      .from("textos_org_members")
      .select("user_id, role, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
    sb
      .from("textos_org_invites")
      .select("id, email, role, token, accepted_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    members: (members ?? []) as Array<{ user_id: string; role: "admin" | "agent" | "readonly"; created_at: string }>,
    invites: (invites ?? []) as Array<{
      id: string;
      email: string;
      role: "admin" | "agent" | "readonly";
      token: string;
      accepted_at: string | null;
      created_at: string;
    }>,
  };
}
