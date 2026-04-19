import { redirect } from "next/navigation";
import { TexOnboarding } from "@/components/onboarding/tex-onboarding";
import { getActiveOrg } from "@/lib/org";

export default async function OnboardingPage() {
  const active = await getActiveOrg();
  // If the user already has a fully set-up org, send them home.
  if (active?.org.onboarding_completed) redirect("/inicio");
  return <TexOnboarding />;
}
