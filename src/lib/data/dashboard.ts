// Loads everything the Garden and Insights screens need.
// Queries run as the signed-in user, so RLS limits them to their own rows.
// Signed-out visitors get an empty "sample garden" payload instead.
import "server-only";
import { getUser } from "@/lib/auth";
import type { createClient } from "@/lib/supabase/server";
import type { DashboardData, PoopLog } from "@/lib/types";

// Enough history for the garden, best streak and the 8-week chart.
export const HISTORY_DAYS = 120;

export async function getDashboardData(): Promise<DashboardData> {
  const { supabase, user } = await getUser();
  if (!user) {
    return { displayName: "Farmer", logs: [], quietDays: [], isDemo: true };
  }

  const sinceMs = Date.now() - HISTORY_DAYS * 86_400_000;
  const since = new Date(sinceMs).toISOString();
  const sinceDay = since.slice(0, 10);

  const [profile, logs, quiet] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase
      .from("poop_logs")
      .select("id, stool_type, category, color, factors, logged_at, notes")
      .gte("logged_at", since)
      .order("logged_at", { ascending: false })
      .limit(500),
    supabase
      .from("quiet_days")
      .select("day")
      .gte("day", sinceDay)
      .order("day", { ascending: false }),
  ]);

  if (quiet.error) {
    // Probably 0002_quiet_days.sql hasn't been run yet. Everything else still works.
    console.warn("quiet_days unavailable:", quiet.error.message);
  }

  return {
    displayName: profile.data?.display_name ?? "Farmer",
    logs: (logs.data ?? []) as PoopLog[],
    quietDays: (quiet.data ?? []).map((q: { day: string }) => q.day),
    isDemo: false,
  };
}

/** Times of the last ~36 hours of logs, so the log screen can count today's. */
export async function getRecentLogTimes(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string[]> {
  const since = new Date(Date.now() - 36 * 3_600_000).toISOString();
  const { data } = await supabase
    .from("poop_logs")
    .select("logged_at")
    .gte("logged_at", since)
    .order("logged_at", { ascending: false })
    .limit(60);
  return (data ?? []).map((r: { logged_at: string }) => r.logged_at);
}
