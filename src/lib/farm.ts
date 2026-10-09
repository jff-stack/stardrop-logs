// Turns log history into garden plots and streaks.
//
// There are two streaks:
//   check-in streak: days in a row with a log or a quiet day (the habit)
//   prize streak: days in a row with a type 3-4 log (grows bigger crops)
// Today never breaks a streak while the day is still going.
//
// Each of the last 12 days is a plot: bare soil, a seed (today), a moon
// (quiet day), a thirsty or soggy sprout, or a parsnip, pumpkin or stardrop
// depending on the prize streak.
import { dayKey, daysAgo } from "./dates";
import type { PoopLog, StoolCategory } from "./types";

export type CropKind =
  | "empty"
  | "seed"
  | "quiet"
  | "thirsty"
  | "soggy"
  | "parsnip"
  | "pumpkin"
  | "stardrop";

/** How a day went, for the week dots. */
export type DayStatus = "movement" | "quiet" | "missed" | "pending";

export interface Plot {
  /** YYYY-MM-DD (local). */
  day: string;
  date: Date;
  isToday: boolean;
  crop: CropKind;
  status: DayStatus;
  /** Movement logs that landed on this day. */
  count: number;
  /** Prize streak ending on this day (0 if not a healthy day). */
  streakAt: number;
  /** Watered soil = at least one movement log that day. */
  watered: boolean;
}

export const PLOT_DAYS = 12;
const LOOKBACK = 120;

/** Best category of a day: healthy beats loose/dry; ties go to the majority. */
function dayQuality(logs: PoopLog[]): StoolCategory | null {
  if (logs.length === 0) return null;
  if (logs.some((l) => l.category === "healthy")) return "healthy";
  const loose = logs.filter((l) => l.category === "loose").length;
  return loose >= logs.length - loose ? "loose" : "dry";
}

function cropFor(quality: StoolCategory | null, quiet: boolean, prize: number, isToday: boolean): CropKind {
  if (quality === null) {
    if (quiet) return "quiet";
    return isToday ? "seed" : "empty";
  }
  if (quality === "dry") return "thirsty";
  if (quality === "loose") return "soggy";
  if (prize >= 7) return "stardrop";
  if (prize >= 3) return "pumpkin";
  return "parsnip";
}

function statusFor(count: number, quiet: boolean, isToday: boolean): DayStatus {
  if (count > 0) return "movement";
  if (quiet) return "quiet";
  return isToday ? "pending" : "missed";
}

/** Group logs by local day key. */
export function logsByDay(logs: PoopLog[]) {
  const map = new Map<string, PoopLog[]>();
  for (const log of logs) {
    const key = dayKey(new Date(log.logged_at));
    const list = map.get(key);
    if (list) list.push(log);
    else map.set(key, [log]);
  }
  return map;
}

/** Build every day in the lookback window, oldest -> today. */
export function buildDays(logs: PoopLog[], quietDays: string[], now = new Date()): Plot[] {
  const grouped = logsByDay(logs);
  const quietSet = new Set(quietDays);

  let prize = 0;
  const days: Plot[] = [];
  for (let i = LOOKBACK - 1; i >= 0; i--) {
    const date = daysAgo(i, now);
    const day = dayKey(date);
    const dayLogs = grouped.get(day) ?? [];
    const isToday = i === 0;
    const quality = dayQuality(dayLogs);
    // A movement log overrides a quiet day marked earlier the same day.
    const quiet = dayLogs.length === 0 && quietSet.has(day);
    prize = quality === "healthy" ? prize + 1 : 0;
    days.push({
      day,
      date,
      isToday,
      crop: cropFor(quality, quiet, prize, isToday),
      status: statusFor(dayLogs.length, quiet, isToday),
      count: dayLogs.length,
      streakAt: quality === "healthy" ? prize : 0,
      watered: dayLogs.length > 0,
    });
  }
  return days;
}

/** Check-in streaks over a day list: current (today pending is OK) and best. */
function checkInStreaks(days: Plot[]) {
  let run = 0;
  let best = 0;
  for (const d of days) {
    if (d.status === "movement" || d.status === "quiet") run++;
    else if (d.status === "missed") run = 0;
    // "pending" (today, not yet checked in) leaves the run untouched.
    best = Math.max(best, run);
  }
  return { current: run, best };
}

export function buildGarden(logs: PoopLog[], quietDays: string[], now = new Date()) {
  const days = buildDays(logs, quietDays, now);
  const today = days[days.length - 1];
  const yesterday = days[days.length - 2];
  const week = days.slice(-7);

  // Days since the last movement (0 = today). null = none in the window.
  let daysSinceMovement: number | null = null;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) {
      daysSinceMovement = days.length - 1 - i;
      break;
    }
  }

  return {
    plots: days.slice(-PLOT_DAYS),
    week,
    streak: checkInStreaks(days),
    /** Prize streak as of now (yesterday's if today has no log yet). */
    prizeStreak: today.streakAt || (today.count === 0 ? yesterday.streakAt : 0),
    loggedToday: today.count > 0,
    quietToday: today.status === "quiet",
    daysSinceMovement,
    checkedInDays7: week.filter((d) => d.status === "movement" || d.status === "quiet").length,
    healthyDays7: week.filter((d) => d.streakAt > 0).length,
  };
}

export type Garden = ReturnType<typeof buildGarden>;
