// Date helpers. All the "which day is it" logic uses local time so each
// person's garden lines up with their own midnight.
/** "YYYY-MM-DD" key for a Date in local time. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Midnight (local) `n` days before `from`. */
export function daysAgo(n: number, from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() - n);
  return d;
}

const SEASONS = ["Winter", "Spring", "Summer", "Fall"] as const;

/**
 * Cozy farm calendar label, e.g. "Fall 9 · Fri".
 * Seasons follow the northern meteorological calendar.
 */
export function seasonLabel(d: Date): { season: (typeof SEASONS)[number]; text: string } {
  const season = SEASONS[Math.floor(((d.getMonth() + 1) % 12) / 3)];
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  return { season, text: `${season} ${d.getDate()} · ${weekday}` };
}

/** "just now", "3h ago", "yesterday", "Mon", ... */
export function relativeTime(iso: string, now = new Date()): string {
  const t = new Date(iso);
  const mins = Math.round((now.getTime() - t.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (dayKey(t) === dayKey(now)) return `${hours}h ago`;
  if (dayKey(t) === dayKey(daysAgo(1, now))) return "yesterday";
  return t.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** "8:42 am" */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export function timeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}
