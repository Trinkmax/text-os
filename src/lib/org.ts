import { cookies } from "next/headers";

export const ORG_COOKIE = "textos_org_id";

export async function getCurrentOrgId(): Promise<string | null> {
  const c = await cookies();
  return c.get(ORG_COOKIE)?.value || null;
}

export async function setCurrentOrgId(id: string) {
  const c = await cookies();
  c.set(ORG_COOKIE, id, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearCurrentOrgId() {
  const c = await cookies();
  c.delete(ORG_COOKIE);
}
