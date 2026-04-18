import { TexOnboarding } from "@/components/onboarding/tex-onboarding";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const existing = await getCurrentOrgId();
  if (existing) {
    const sb = await createSbServer();
    const { data } = await sb.from("textos_orgs").select("onboarding_completed").eq("id", existing).maybeSingle();
    if (data?.onboarding_completed) redirect("/inicio");
  }
  return <TexOnboarding />;
}
