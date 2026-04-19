import { cookies } from "next/headers";
import { cache } from "react";
import { createSbServer } from "@/lib/supabase/server";
import type { Row } from "@/lib/supabase/types";

export const ORG_COOKIE = "textos_org_id";

export type OrgMembership = {
  org_id: string;
  role: "admin" | "agent" | "readonly";
};

export type ActiveOrg = {
  org: Pick<
    Row<"textos_orgs">,
    "id" | "name" | "logo_url" | "owner_display_name" | "onboarding_completed"
  >;
  role: OrgMembership["role"];
  memberships: Array<
    OrgMembership & { name: string; logo_url: string | null }
  >;
};

/** @deprecated Use `getActiveOrg()` instead — it verifies membership. */
export async function getCurrentOrgId(): Promise<string | null> {
  const active = await getActiveOrg();
  return active?.org.id ?? null;
}

export async function setCurrentOrgId(id: string) {
  const c = await cookies();
  c.set(ORG_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearCurrentOrgId() {
  const c = await cookies();
  c.delete(ORG_COOKIE);
}

/**
 * Resolve the org the authenticated user is currently operating on.
 *
 * Order:
 *   1. Cookie hint `textos_org_id` — but only if the user is a member.
 *   2. Fallback to the user's first membership.
 *   3. null when the user has no orgs (→ send to /onboarding).
 *
 * RLS does the real isolation; this helper only picks WHICH org the UI
 * should display and returns the role so admin-only UI can be gated.
 */
export const getActiveOrg = cache(async (): Promise<ActiveOrg | null> => {
  const sb = await createSbServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: memberRows } = await sb
    .from("textos_org_members")
    .select("org_id, role")
    .eq("user_id", user.id);

  if (!memberRows || memberRows.length === 0) return null;

  const orgIds = memberRows.map((m) => m.org_id);
  const { data: orgs } = await sb
    .from("textos_orgs")
    .select("id, name, logo_url, owner_display_name, onboarding_completed")
    .in("id", orgIds);

  if (!orgs || orgs.length === 0) return null;

  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const memberships = memberRows
    .filter((m) => orgById.has(m.org_id))
    .map((m) => {
      const o = orgById.get(m.org_id)!;
      return {
        org_id: m.org_id,
        role: m.role as OrgMembership["role"],
        name: o.name,
        logo_url: o.logo_url,
      };
    });

  const c = await cookies();
  const hint = c.get(ORG_COOKIE)?.value;

  const picked =
    memberRows.find((m) => m.org_id === hint && orgById.has(m.org_id)) ??
    memberRows.find((m) => orgById.has(m.org_id))!;

  const org = orgById.get(picked.org_id)!;
  return {
    org: {
      id: org.id,
      name: org.name,
      logo_url: org.logo_url,
      owner_display_name: org.owner_display_name,
      onboarding_completed: org.onboarding_completed,
    },
    role: picked.role as OrgMembership["role"],
    memberships,
  };
});

/** Shortcut used by server actions that just need the id. */
export async function requireOrgId(): Promise<string> {
  const active = await getActiveOrg();
  if (!active) throw new Error("No org");
  return active.org.id;
}

export async function requireAdminOrgId(): Promise<string> {
  const active = await getActiveOrg();
  if (!active) throw new Error("No org");
  if (active.role !== "admin") throw new Error("Solo administradores");
  return active.org.id;
}
