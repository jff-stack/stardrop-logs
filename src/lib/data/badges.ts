// Everything the badges page needs: when each log happened and which days
// were quiet days, for the user's whole history.
//
// The dashboard only loads the last 120 days, which isn't enough for "longest
// streak" or a 365-day badge. Only the two date columns are fetched here, no
// log contents. Rows come in pages because the API caps how many it returns
// per request, and a silent cut-off would quietly shrink someone's streak.
import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const PAGE = 1000;

export interface BadgeHistory {
  /** logged_at of every log, oldest first (ISO). */
  logTimes: string[];
  /** Quiet days as local day keys (YYYY-MM-DD). */
  quietDays: string[];
  /** False if a request failed, so the page can say so instead of showing less. */
  complete: boolean;
}

async function allValues(supabase: Client, table: "poop_logs" | "quiet_days", column: "logged_at" | "day") {
  const values: string[] = [];
  for (let from = 0; ; from += PAGE) {
    // RLS keeps this to the signed-in user's rows.
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .order(column, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return { values, ok: false };
    for (const row of data as unknown as Record<string, string>[]) values.push(row[column]);
    if (data.length < PAGE) return { values, ok: true };
  }
}

export async function getBadgeHistory(supabase: Client): Promise<BadgeHistory> {
  const [logs, quiet] = await Promise.all([
    allValues(supabase, "poop_logs", "logged_at"),
    allValues(supabase, "quiet_days", "day"),
  ]);
  return { logTimes: logs.values, quietDays: quiet.values, complete: logs.ok && quiet.ok };
}
