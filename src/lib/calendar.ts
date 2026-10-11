// The month calendar on Insights, as plain data. The component only draws
// what buildMonth returns.
//
// Days are worked out from whole numbers (year, month, day), never by adding
// hours to a Date, so a month with a clock change still has every day once.
//
// The grid is neutral on purpose: a day shows whether it has logs and how
// many, or that it was a quiet day. It never shows whether a day was "good".
import { addDays } from "./dates";
import { weekdayOf, zonedMidnight } from "./week";

export interface CalendarCell {
  /** YYYY-MM-DD */
  dayKey: string;
  /** Day of the month, 1 to 31. */
  day: number;
  /** False for the few days of the months either side that fill out the grid. */
  inMonth: boolean;
  /** Logs on this day. */
  count: number;
  /** A quiet day with no logs. (A log on the same day wins, as everywhere else.) */
  hasQuiet: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface MonthRef {
  year: number;
  /** 0 = January. */
  monthIndex: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (year: number, monthIndex: number, day: number) => `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

export const daysInMonth = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/**
 * A Sunday-first grid for one month: 5 or 6 rows of 7 days.
 * @param dayCounts  logs per day key
 * @param quietDays  day keys marked quiet
 * @param today      today's day key in the user's timezone
 */
export function buildMonth(
  year: number,
  monthIndex: number,
  dayCounts: ReadonlyMap<string, number>,
  quietDays: ReadonlySet<string>,
  today: string,
): CalendarCell[][] {
  const first = keyOf(year, monthIndex, 1);
  const lead = weekdayOf(first);
  // Always at least 5 rows, so the card doesn't change height for the rare
  // 28-day February that starts on a Sunday.
  const rows = Math.max(5, Math.ceil((lead + daysInMonth(year, monthIndex)) / 7));
  const start = addDays(first, -lead);
  const prefix = first.slice(0, 7);

  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => {
      const dayKey = addDays(start, r * 7 + c);
      const count = dayCounts.get(dayKey) ?? 0;
      return {
        dayKey,
        day: Number(dayKey.slice(8)),
        inMonth: dayKey.startsWith(prefix),
        count,
        hasQuiet: count === 0 && quietDays.has(dayKey),
        isToday: dayKey === today,
        isFuture: dayKey > today,
      };
    }),
  );
}

/** Can this day be opened? Only days of this month that have something on them. */
export const isOpenable = (cell: CalendarCell) => cell.inMonth && !cell.isFuture && (cell.count > 0 || cell.hasQuiet);

export const monthOf = (dayKey: string): MonthRef => ({ year: Number(dayKey.slice(0, 4)), monthIndex: Number(dayKey.slice(5, 7)) - 1 });

export const monthKey = ({ year, monthIndex }: MonthRef) => `${year}-${pad(monthIndex + 1)}`;

export function shiftMonth({ year, monthIndex }: MonthRef, by: number): MonthRef {
  const n = year * 12 + monthIndex + by;
  return { year: Math.floor(n / 12), monthIndex: ((n % 12) + 12) % 12 };
}

/** Negative if a is earlier than b, 0 if the same month, positive if later. */
export const compareMonths = (a: MonthRef, b: MonthRef) => a.year * 12 + a.monthIndex - (b.year * 12 + b.monthIndex);

/** "October 2026" */
export function monthLabel({ year, monthIndex }: MonthRef, locale?: string): string {
  return new Date(Date.UTC(year, monthIndex, 15)).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
}

/** "Thursday, Oct 9" for a day key. */
export function dayHeading(dayKey: string, locale?: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}

/** What a screen reader hears for a day: "Oct 9, 3 logs" / "Oct 12, quiet day". */
export function dayLabel(cell: CalendarCell, locale?: string): string {
  const [y, m, d] = cell.dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  if (cell.count > 0) return `${date}, ${cell.count === 1 ? "1 log" : `${cell.count} logs`}`;
  if (cell.hasQuiet) return `${date}, quiet day`;
  return `${date}, nothing logged`;
}

/**
 * The instants to ask the server for, for one month: from local midnight on
 * the 1st to local midnight on the 1st of the next month, with a day added
 * each side. The browser sorts rows into days afterwards, so the padding only
 * has to be generous, not exact. Never reaches past tomorrow.
 */
export function monthRange(month: MonthRef, timeZone: string, now: Date): { from: string; to: string } {
  const DAY = 86_400_000;
  const next = shiftMonth(month, 1);
  const from = zonedMidnight(keyOf(month.year, month.monthIndex, 1), timeZone).getTime() - DAY;
  const to = zonedMidnight(keyOf(next.year, next.monthIndex, 1), timeZone).getTime() + DAY;
  return { from: new Date(from).toISOString(), to: new Date(Math.min(to, now.getTime() + DAY)).toISOString() };
}

/** Logs per day from their timestamps, using the caller's idea of "which day". */
export function countByDay(times: readonly string[], dayOf: (iso: string) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of times) {
    const day = dayOf(t);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

export type Arrow = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End";

/**
 * Where an arrow key goes from a day. Empty days can't be focused, so left
 * and right step to the previous or next day that can be opened, and up and
 * down look along the same weekday column. Null means stay put.
 */
export function nextOpenable(rows: readonly CalendarCell[][], from: string, key: Arrow): string | null {
  const flat = rows.flat();
  const i = flat.findIndex((c) => c.dayKey === from);
  if (i < 0) return null;
  const open = (c: CalendarCell | undefined) => (c && isOpenable(c) ? c.dayKey : null);

  if (key === "Home") return open(flat.find(isOpenable));
  if (key === "End") return open(flat.findLast(isOpenable));

  const step = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : key === "ArrowUp" ? -7 : 7;
  for (let j = i + step; j >= 0 && j < flat.length; j += step) {
    if (isOpenable(flat[j])) return flat[j].dayKey;
  }
  return null;
}
