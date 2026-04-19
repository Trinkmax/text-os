import { redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/org";

export default async function Home() {
  const active = await getActiveOrg();
  if (!active) redirect("/onboarding");
  if (!active.org.onboarding_completed) redirect("/onboarding");
  redirect("/inicio");
}
