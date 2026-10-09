// Turns raw logs into one small record per day. This is the only shape a
// model ever sees, so it's also where privacy is decided: free-text notes and
// row ids never leave this function.
import { dayKey, daysAgo } from "@/lib/dates";
import { logsByDay } from "@/lib/farm";
import type { PoopLog } from "@/lib/types";
import type { DayFeatures } from "./types";

export function dailyFeatures(logs: PoopLog[], quietDays: string[], now: Date, days = 60): DayFeatures[] {
  const grouped = logsByDay(logs);
  const quiet = new Set(quietDays);
  const out: DayFeatures[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i, now);
    const day = dayKey(date);
    const list = grouped.get(day) ?? [];
    const factors: Record<string, boolean> = {};
    for (const log of list) for (const f of log.factors) factors[f] = true;
    const firstHour = list.length
      ? Math.min(...list.map((l) => new Date(l.logged_at).getHours()))
      : null;

    out.push({
      day,
      weekday: date.getDay(),
      count: list.length,
      quiet: list.length === 0 && quiet.has(day),
      avgType: list.length ? list.reduce((sum, l) => sum + l.stool_type, 0) / list.length : null,
      healthy: list.filter((l) => l.category === "healthy").length,
      dry: list.filter((l) => l.category === "dry").length,
      loose: list.filter((l) => l.category === "loose").length,
      firstHour,
      factors,
    });
  }
  return out;
}
