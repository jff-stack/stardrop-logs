// Date helpers. All the "which day is it" logic uses local time so each
// person's garden lines up with their own midnight.
/** "YYYY-MM-DD" key for a Date in local time. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// One formatter per timezone; building them is slow and badges needs thousands of keys.
const zoneFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * "YYYY-MM-DD" for a Date in a named timezone (e.g. "Europe/London").
 * Same idea as dayKey, for when "local" has to be spelled out.
 */
export function dayKeyIn(d: Date, timeZone: string): string {
  let format = zoneFormatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    zoneFormatters.set(timeZone, format);
  }
  const parts = format.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * The day key `n` days after `day` (negative goes back). Works on the
 * calendar date alone, so clock changes can't skip or repeat a day.
 */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Midnight (local) `n` days before `from`. */
export function daysAgo(n: number, from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() - n);
  return d;
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
