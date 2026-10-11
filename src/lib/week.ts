// "This week" for the recent-logs list: Sunday 00:00 in the user's own
// timezone, up to now.
//
// Everything here works from the calendar date (year, month, day) in that
// timezone and only then turns it into an instant. Stepping back in 24-hour
// blocks would land an hour off in a week where the clocks change.
import { addDays, dayKeyIn } from "./dates";

const partsFormat = new Map<string, Intl.DateTimeFormat>();

/** How far ahead of UTC a timezone is at a given instant, in ms. */
function offsetAt(instant: number, timeZone: string): number {
  let format = partsFormat.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    partsFormat.set(timeZone, format);
  }
  const parts = format.formatToParts(new Date(instant));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return wall - Math.floor(instant / 1000) * 1000;
}

/** The instant a calendar day (YYYY-MM-DD) begins in a timezone. */
export function zonedMidnight(day: string, timeZone: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d);
  // Guess with the offset at that wall time, then again with the offset at
  // the guess: the second pass settles it when a clock change falls between.
  let t = wall - offsetAt(wall, timeZone);
  t = wall - offsetAt(t, timeZone);
  // In the few places where the clocks jump at midnight itself, 00:00 doesn't
  // exist that day; use the first moment that does belong to the day.
  for (let i = 0; i < 4 && dayKeyIn(new Date(t), timeZone) < day; i++) t += 30 * 60_000;
  return new Date(t);
}

/** 0 = Sunday ... 6 = Saturday, for a day key. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** The day key of the Sunday that starts the week `now` is in. */
export function weekStartDay(now: Date, timeZone: string): string {
  const today = dayKeyIn(now, timeZone);
  return addDays(today, -weekdayOf(today));
}

/** The most recent Sunday 00:00 in the user's timezone, as an instant. */
export function startOfWeek(now: Date, timeZone: string): Date {
  return zonedMidnight(weekStartDay(now, timeZone), timeZone);
}

/**
 * Is this moment in the current week (Sunday 00:00 local up to now)?
 * A few minutes ahead of now still counts: a log saved from a device whose
 * clock runs slightly fast shouldn't vanish from the list.
 */
export function isInCurrentWeek(instant: Date | string | number, now: Date, timeZone: string): boolean {
  const t = new Date(instant).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= startOfWeek(now, timeZone).getTime() && t <= now.getTime() + 5 * 60_000;
}
