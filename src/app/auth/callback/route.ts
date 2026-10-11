// Landing spot for links from auth emails that carry a PKCE ?code=.
// Works when the link is opened in the same browser that asked for it.
//
// A code doesn't say what it was for, so sign-up adds ?type=signup to the
// address it asks Supabase to come back to (see lib/auth-client.ts).
import { NextResponse, type NextRequest } from "next/server";
import { confirmDestination } from "@/lib/confirm";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const { supabase, withCookies } = createRouteClient(request);

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const { path, signOut } = confirmDestination({
    flow: "code",
    type: searchParams.get("type"),
    ok,
    next: searchParams.get("next"),
  });
  // "local" ends just the session this link created, not the user's others.
  if (signOut) await supabase.auth.signOut({ scope: "local" });
  return withCookies(NextResponse.redirect(new URL(path, origin)));
}
