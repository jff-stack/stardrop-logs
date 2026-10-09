// Runs before each page request. It refreshes the Supabase session cookie and
// does quick redirects (signed-out -> /login for private pages, signed-in away
// from /login and /signup). It's a convenience, not the security boundary:
// pages re-check the user and Postgres RLS guards the data itself.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

const PRIVATE = ["/log", "/settings", "/reset"];
const GUEST_ONLY = ["/login", "/signup"];

const matches = (path: string, list: string[]) =>
  list.some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Don't put anything between createServerClient and getClaims, or users can
  // get randomly logged out (Supabase SSR guidance).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  const redirectTo = (url: URL) => {
    const res = NextResponse.redirect(url);
    // Keep any refreshed auth cookies on the redirect too.
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  if (!signedIn && matches(path, PRIVATE)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path);
    return redirectTo(url);
  }
  if (signedIn && matches(path, GUEST_ONLY)) {
    return redirectTo(new URL("/", request.url));
  }

  return response;
}

export const config = {
  // Skip static files, images and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
