import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// getClaims() verifies the JWT signature, unlike getSession() which just
// trusts the cookie. Always use this for "who is the user" on the server.
export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { supabase, user: null };
  return {
    supabase,
    user: { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" },
  };
}

// For pages that need a signed-in user. Sends everyone else to /login and
// brings them back afterwards.
export async function requireUser(next: string) {
  const result = await getUser();
  if (!result.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase: result.supabase, user: result.user };
}
