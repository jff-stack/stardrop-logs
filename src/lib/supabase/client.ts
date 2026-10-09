// Supabase client for the browser, one per tab.
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";
import { SESSION_COOKIE_OPTIONS } from "./session";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
  });
  return client;
}
