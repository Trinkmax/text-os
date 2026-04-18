import { redirect } from "next/navigation";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { ContactsView } from "@/components/contacts/contacts-view";

export const dynamic = "force-dynamic";

export default async function ContactosPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();
  const [{ data: contacts }, { data: stages }] = await Promise.all([
    sb
      .from("textos_contacts")
      .select("*")
      .eq("org_id", orgId)
      .order("last_interaction_at", { ascending: false })
      .limit(500),
    sb.from("textos_stages").select("*").eq("org_id", orgId).order("position"),
  ]);
  return <ContactsView contacts={contacts || []} stages={stages || []} />;
}
