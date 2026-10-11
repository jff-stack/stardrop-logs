// Supabase client for server components, actions and route handlers. It reads
// the session from cookies, so whatever calls it must sit inside Suspense.
// Queries run as the user, so RLS decides what comes back.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";
import { SESSION_COOKIE_OPTIONS } from "./session";

export async function createClient() {
  // Wait for a real request before going any further. Supabase checks the
  // session's expiry against the clock, and Next refuses clock reads while it
  // is pre-building a page. Reading cookies alone isn't enough to stop that:
  // with partial prefetching, cookies are available during the pre-build.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: proxy.ts refreshes the session on every request.
        }
      },
    },
  });
}
