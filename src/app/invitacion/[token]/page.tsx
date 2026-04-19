import { redirect } from "next/navigation";
import Link from "next/link";
import { createSbServer } from "@/lib/supabase/server";
import { acceptInvite } from "@/app/actions/team";
import { setCurrentOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const sb = await createSbServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/invitacion/${token}`)}`);
  }

  // Look up invite to show human-friendly confirmation. RLS only lets the user
  // see invites that match their email address.
  const { data: invite } = await sb
    .from("textos_org_invites")
    .select("id, org_id, email, role, accepted_at, textos_orgs!inner(name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return (
      <EmptyState
        title="Invitación inválida"
        body="El link no coincide con tu email o ya fue usado. Pedile al admin que te genere uno nuevo."
      />
    );
  }

  // Accept on first GET — this is a one-click flow.
  if (!invite.accepted_at) {
    const res = await acceptInvite(token);
    if (!res.ok) {
      return (
        <EmptyState
          title="No pudimos aceptar la invitación"
          body={res.error}
        />
      );
    }
    await setCurrentOrgId(res.data!.orgId);
    redirect("/inicio");
  }

  redirect("/inicio");
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-0 text-fg">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold mb-2">{title}</h1>
        <p className="text-sm text-fg-3 mb-6">{body}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-bg-2 border border-[color:var(--border)] text-sm hover:bg-bg-3 transition"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
