// Supabase client for the email-link route handlers (/auth/confirm and
// /auth/callback). Those answer with a redirect, so the cookies Supabase
// wants to set or clear have to be copied onto that redirect by hand, the
// same way proxy.ts does it. Nothing here relies on Next doing it for us.
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";
import { SESSION_COOKIE_OPTIONS } from "./session";

type CookieOptions = Parameters<NextResponse["cookies"]["set"]>[2];

export function createRouteClient(request: NextRequest) {
  // What the browser's cookies will look like once the response lands.
  // Supabase reads this back to work out which cookies to clear on sign-out,
  // so it has to include the ones it set a moment ago during this request.
  const jar = new Map(request.cookies.getAll().map((c) => [c.name, c.value]));
  // Every change to send back. Later writes to the same cookie win, so a
  // sign-in followed by a sign-out ends up as a single "clear this cookie".
  const changes = new Map<string, { value: string; options: CookieOptions }>();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return [...jar].map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          if (value) jar.set(name, value);
          else jar.delete(name);
          changes.set(name, { value, options });
        }
      },
    },
  });

  /** Puts the collected cookie changes on the response that's about to go out. */
  function withCookies<R extends NextResponse>(response: R): R {
    for (const [name, { value, options }] of changes) response.cookies.set(name, value, options);
    return response;
  }

  return { supabase, withCookies };
}
