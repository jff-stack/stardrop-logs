// Landing spot for auth emails that use a token hash (see README -> email
// templates). Unlike the PKCE code flow this works even if the link is opened
// on a different device.
//
// Where it goes next is decided in lib/confirm.ts. Nothing from the link
// (token, type, Supabase's error text) is ever passed along.
import { NextResponse, type NextRequest } from "next/server";
import { confirmDestination, isKnownType } from "@/lib/confirm";
import { createRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const { supabase, withCookies } = createRouteClient(request);

  let ok = false;
  if (tokenHash && isKnownType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  const { path, signOut } = confirmDestination({ flow: "token", type, ok, next: searchParams.get("next") });
  // "local" ends just the session this link created, not the user's others.
  if (signOut) await supabase.auth.signOut({ scope: "local" });
  return withCookies(NextResponse.redirect(new URL(path, origin)));
}
