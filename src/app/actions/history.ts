"use server";

// Loads one stretch of history for the Insights calendar. The pages already
// carry the last few months; this is for months older than that.
//
// It only reads, and only the signed-in user's own rows (row-level security).
// The browser says which instants it wants and sorts the rows into days
// itself, so the server never needs to know anyone's timezone.
import { getUser } from "@/lib/auth";
import { fetchAllPages } from "@/lib/export";
import type { PoopLog } from "@/lib/types";
import { MonthRangeSchema } from "@/lib/validation";

export type MonthData =
  | { ok: true; logs: PoopLog[]; quietDays: string[] }
  | { ok: false; error: string };

// 50 logs a day is the database's own limit, so a 45-day stretch can't
// honestly reach this. It's a stop for anything that isn't honest.
const MAX_ROWS = 3000;

export async function getMonthData(from: string, to: string): Promise<MonthData> {
  const parsed = MonthRangeSchema.safeParse({ from, to });
  if (!parsed.success) return { ok: false, error: "That month can't be shown." };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Your session ran out. Please sign in again." };

  const range = parsed.data;
  const [logs, quiet] = await Promise.all([
    fetchAllPages<PoopLog>(
      async (a, b) => {
        const { data, error } = await supabase
          .from("poop_logs")
          .select("id, stool_type, category, color, factors, logged_at, notes")
          .gte("logged_at", range.from)
          .lt("logged_at", range.to)
          // Newest first, like the rest of the app; id breaks ties so pages can't overlap.
          .order("logged_at", { ascending: false })
          .order("id", { ascending: true })
          .range(a, b);
        return error ? null : (data as PoopLog[]);
      },
      { max: MAX_ROWS },
    ),
    supabase
      .from("quiet_days")
      .select("day")
      .gte("day", range.from.slice(0, 10))
      .lte("day", range.to.slice(0, 10))
      .order("day", { ascending: true }),
  ]);

  // A request that failed part-way would look like a quieter month than it was.
  if (quiet.error || (!logs.complete && logs.rows.length < MAX_ROWS)) {
    return { ok: false, error: "Couldn't load that month. Try again?" };
  }
  return { ok: true, logs: logs.rows, quietDays: (quiet.data ?? []).map((q: { day: string }) => q.day) };
}
