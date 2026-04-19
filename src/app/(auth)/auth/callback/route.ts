import { NextResponse, type NextRequest } from "next/server";
import { createSbServer } from "@/lib/supabase/server";

// Used by Supabase email confirmation / OAuth flows. Supabase redirects to
// /auth/callback?code=…; we exchange the code for a session cookie and then
// send the user to their requested next page.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (code) {
    const sb = await createSbServer();
    await sb.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
