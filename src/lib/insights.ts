// Numbers and series for the Insights screen. "Prize rate" is the share of
// logs that were Bristol 3-4. Everything here is plain functions.
import { dayKey, daysAgo } from "./dates";
import { FACTOR_LIST } from "./factors";
import type { Factor, PoopLog, StoolType } from "./types";

const DAY = 86_400_000;

function inRange(logs: PoopLog[], from: Date, to: Date) {
  const a = from.getTime();
  const b = to.getTime();
  return logs.filter((l) => {
    const t = new Date(l.logged_at).getTime();
    return t >= a && t < b;
  });
}

/** Percentage of healthy logs, or null when there are none. */
function prizeRate(logs: PoopLog[]): number | null {
  if (logs.length === 0) return null;
  return Math.round((logs.filter((l) => l.category === "healthy").length / logs.length) * 100);
}

export interface WeekPoint {
  /** First day of the 7-day window. */
  start: Date;
  label: string;
  rate: number | null;
  logs: number;
}

export interface DayPoint {
  date: Date;
  label: string;
  /** Average Bristol type that day (1–7), null if no logs. */
  avgType: number | null;
  quiet: boolean;
  logs: number;
}

export interface FactorImpact {
  factor: Factor;
  label: string;
  withRate: number;
  withoutRate: number;
  diff: number;
  withCount: number;
}

export function buildInsights(logs: PoopLog[], quietDays: string[], now = new Date()) {
  const tomorrow = daysAgo(-1, now);
  const quietSet = new Set(quietDays);

  // KPIs: last 30 days vs the 30 before
  const last30 = inRange(logs, daysAgo(29, now), tomorrow);
  const prev30 = inRange(logs, daysAgo(59, now), daysAgo(29, now));
  const rate30 = prizeRate(last30);
  const ratePrev = prizeRate(prev30);
  const movementDays30 = new Set(last30.map((l) => dayKey(new Date(l.logged_at)))).size;
  const quiet30 = quietDays.filter((d) => d >= dayKey(daysAgo(29, now))).length;

  // Weekly prize rate: 8 rolling weeks, oldest -> newest
  const weekly: WeekPoint[] = Array.from({ length: 8 }, (_, k) => {
    const i = 7 - k;
    const start = daysAgo(i * 7 + 6, now);
    const end = new Date(daysAgo(i * 7, now).getTime() + DAY);
    const wk = inRange(logs, start, end);
    return {
      start,
      label: i === 0 ? "Now" : start.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
      rate: prizeRate(wk),
      logs: wk.length,
    };
  });

  // Bristol mix, last 30 days
  const mix = ([1, 2, 3, 4, 5, 6, 7] as StoolType[]).map((type) => ({
    type,
    count: last30.filter((l) => l.stool_type === type).length,
  }));

  // Daily average type, last 14 days
  const daily: DayPoint[] = Array.from({ length: 14 }, (_, k) => {
    const date = daysAgo(13 - k, now);
    const dayLogs = inRange(logs, date, new Date(date.getTime() + DAY));
    const avg = dayLogs.length
      ? dayLogs.reduce((s, l) => s + l.stool_type, 0) / dayLogs.length
      : null;
    return {
      date,
      label: date.toLocaleDateString(undefined, { weekday: "narrow" }),
      avgType: avg === null ? null : Math.round(avg * 2) / 2,
      quiet: dayLogs.length === 0 && quietSet.has(dayKey(date)),
      logs: dayLogs.length,
    };
  });

  // Factor impact, last 60 days (needs a little data either way)
  const last60 = inRange(logs, daysAgo(59, now), tomorrow);
  const factorImpact: FactorImpact[] = FACTOR_LIST.flatMap((f) => {
    const withF = last60.filter((l) => l.factors.includes(f.key));
    const withoutF = last60.filter((l) => !l.factors.includes(f.key));
    if (withF.length < 3 || withoutF.length < 3) return [];
    const withRate = prizeRate(withF) ?? 0;
    const withoutRate = prizeRate(withoutF) ?? 0;
    return [{
      factor: f.key,
      label: f.label,
      withRate,
      withoutRate,
      diff: withRate - withoutRate,
      withCount: withF.length,
    }];
  })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 4);

  return {
    kpis: {
      prizeRate30: rate30,
      prizeDelta: rate30 !== null && ratePrev !== null ? rate30 - ratePrev : null,
      movementDays30,
      quietDays30: quiet30,
      logs30: last30.length,
    },
    weekly,
    mix,
    daily,
    factorImpact,
  };
}

export type Insights = ReturnType<typeof buildInsights>;
