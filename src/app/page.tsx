import { redirect } from "next/navigation";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";

export default async function Home() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();
  const { data } = await sb
    .from("textos_orgs")
    .select("onboarding_completed")
    .eq("id", orgId)
    .maybeSingle();
  if (!data) redirect("/onboarding");
  if (!data.onboarding_completed) redirect("/onboarding");
  redirect("/inicio");
}
