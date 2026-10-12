// Picks the one everyday tip (and, rarely, a reminder) to show today.
//
// Pure: logs in, a choice out. It runs in the browser, in the user's own
// timezone, and nothing about what it chose leaves the device. It never
// diagnoses: tips are generic habits, and the reasons it gives are plain
// facts about the user's own recent logs ("3 of your last 5 logs were type
// 1-2"), not conclusions about their health.
//
// Order of play:
//   1. stay quiet (tips off, a colour that already has its own message, or a
//      day count that is already high: never encourage going more often)
//   2. a sustained pattern -> the "worth a doctor's chat" tip, once per 14 days
//   3. a recent pattern (dry, loose, a longer gap than usual, steady)
//   4. a factor that lines up with softer or firmer logs (needs 8 days each way)
//   5. otherwise the day's evergreen tip, rotating, skipping recent ones
import { COLORS } from "./colors";
import { addDays, dayKeyIn } from "./dates";
import { FACTOR_LIST } from "./factors";
import { seededRandom } from "./random";
import { NORMAL_MAX_PER_DAY } from "./rhythm";
import { SUSTAINED_TIP_ID, TIPS, tipById, type Tip, type TipAudience } from "./tip-library";
import type { Factor, PoopLog } from "./types";

/** A tip is not repeated for this many days. */
export const NO_REPEAT_DAYS = 14;
/** How long the sustained-pattern tip stays quiet after showing. */
export const SUSTAINED_EVERY_DAYS = 14;

const DRY_OR_LOOSE = new Set([1, 2, 6, 7]);
const MINUTES_PER_DAY = 1440;
const REMINDER_WINDOW_MIN = 45;
const REMINDER_MAX_SPREAD_MIN = 90;

export const REMINDER_TEXT =
  "You usually go around now. A few minutes after a drink or breakfast works for a lot of people.";

export interface SeenTip {
  id: string;
  /** Local day (YYYY-MM-DD) it was shown. */
  day: string;
}

/** What the card shows. Library tips, or the insight made from the user's own logs. */
export interface CoachTip {
  id: string;
  text: string;
  topic: Tip["topic"] | "insight";
  evidence: Tip["evidence"];
  sourceId?: string;
}

export interface CoachInput {
  logs: PoopLog[];
  /** Local days (YYYY-MM-DD) marked as quiet days. */
  quietDays: string[];
  now: Date;
  /** IANA name, e.g. "Europe/London". */
  tz: string;
  seen: SeenTip[];
  tipsEnabled: boolean;
  remindersEnabled: boolean;
  /** The local day the user last dismissed a reminder, if any. */
  reminderDismissedDay?: string | null;
  /** Swappable for tests. */
  library?: readonly Tip[];
}

export interface CoachResult {
  primary: CoachTip | null;
  /** One plain line under the tip: why this one. */
  why: string;
  /** What "Another tip" shows, if there's one more. */
  extra: { tip: CoachTip; why: string } | null;
  reminder: { text: string } | null;
}

const NOTHING: CoachResult = { primary: null, why: "", extra: null, reminder: null };

// ---------------------------------------------------------------- time helpers

const clockFormats = new Map<string, Intl.DateTimeFormat>();

/** Minutes since local midnight, on the wall clock of `tz` (so clock changes don't shift it). */
export function minutesOfDay(d: Date, tz: string): number {
  let f = clockFormats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    clockFormats.set(tz, f);
  }
  const parts = f.formatToParts(d);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return (num("hour") % 24) * 60 + num("minute");
}

/** Shortest distance round the 24-hour clock, in minutes. */
export function circularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % MINUTES_PER_DAY;
  return Math.min(d, MINUTES_PER_DAY - d);
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * The time of day the values cluster around: the observed time with the
 * smallest total distance to the rest, measured round the clock so 23:50 and
 * 00:10 sit together.
 */
export function circularMedian(minutes: number[]): number {
  let best = minutes[0];
  let bestTotal = Infinity;
  for (const c of [...minutes].sort((a, b) => a - b)) {
    const total = minutes.reduce((s, m) => s + circularDistance(m, c), 0);
    if (total < bestTotal) {
      best = c;
      bestTotal = total;
    }
  }
  return best;
}

const dayNumber = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};
const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from);

function seedOf(day: string): number {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619);
  return h >>> 0;
}

function safeZone(tz: string): string {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// ------------------------------------------------------------------- the engine

export function coach(input: CoachInput): CoachResult {
  const tz = safeZone(input.tz);
  const library = input.library ?? TIPS;
  const today = dayKeyIn(input.now, tz);
  const dayOf = (l: PoopLog) => dayKeyIn(new Date(l.logged_at), tz);

  // Newest first, each with its local day worked out once.
  const logs = input.logs
    .map((log) => ({ log, day: dayOf(log), at: new Date(log.logged_at).getTime() }))
    .filter((x) => Number.isFinite(x.at))
    .sort((a, b) => b.at - a.at);

  // Never encourage more: a busy week (above the usual ceiling on 2+ days) means
  // nothing new, neither tip nor reminder.
  const perDay = new Map<string, number>();
  for (const x of logs) perDay.set(x.day, (perDay.get(x.day) ?? 0) + 1);
  let busyDays = 0;
  for (let back = 0; back < 7; back++) {
    if ((perDay.get(addDays(today, -back)) ?? 0) > NORMAL_MAX_PER_DAY) busyDays++;
  }
  if (busyDays >= 2) return NOTHING;

  // A colour that has its own message keeps it; nothing is added beside it.
  const latest = logs[0];
  if (latest && COLORS[latest.log.color].checkIn) return NOTHING;

  const reminder = input.remindersEnabled ? reminderFor(logs, input, tz, today) : null;
  if (!input.tipsEnabled) return { ...NOTHING, reminder };

  const windowStart = addDays(today, -13);
  const inWindow = logs.filter((x) => x.day >= windowStart);
  const last5 = inWindow.slice(0, 5);
  // Patterns need five logs to go on: with less history it's only everyday tips.
  const enough = last5.length === 5;
  const hardCount = enough ? last5.filter((x) => x.log.stool_type <= 2).length : 0;
  const looseCount = enough ? last5.filter((x) => x.log.stool_type >= 6).length : 0;

  const seenBefore = new Set(
    input.seen.filter((s) => s.day < today && s.day > addDays(today, -NO_REPEAT_DAYS - 1)).map((s) => s.id),
  );
  const shownToday = new Set(input.seen.filter((s) => s.day === today).map((s) => s.id));

  // 2. Sustained pattern: most of two weeks, never one log.
  const oldestDay = logs.length ? logs[logs.length - 1].day : today;
  const hasTwoWeeks = daysBetween(oldestDay, today) >= 13;
  const dryOrLoose = inWindow.filter((x) => DRY_OR_LOOSE.has(x.log.stool_type)).length;
  const sustained = hasTwoWeeks && inWindow.length >= 8 && dryOrLoose * 10 >= inWindow.length * 7;
  const sustainedTip = tipById(SUSTAINED_TIP_ID, library);
  const sustainedSeen = input.seen.some((s) => s.id === SUSTAINED_TIP_ID && s.day < today && s.day > addDays(today, -SUSTAINED_EVERY_DAYS - 1));
  if (sustained && sustainedTip && !sustainedSeen) {
    return {
      primary: sustainedTip,
      why: "Because most of your logs over the last two weeks were type 1-2 or 6-7.",
      extra: null,
      reminder,
    };
  }

  // 3. Recent pattern. They can't both hold: three of five and three of five is six.
  let audience: TipAudience = "any";
  let why = "A tip for any day.";
  if (hardCount >= 3) {
    audience = "hard";
    why = `Because ${hardCount} of your last 5 logs were type 1-2.`;
  } else if (looseCount >= 3) {
    audience = "loose";
    why = `Because ${looseCount} of your last 5 logs were type 6-7.`;
  } else if (isLongGap(logs, today)) {
    audience = "gap";
    why = "Because it's been longer than your usual gap between logs.";
  } else if (enough && last5.every((x) => x.log.stool_type >= 3 && x.log.stool_type <= 5)) {
    audience = "steady";
    why = "Because your last 5 logs were all type 3-5.";
  }

  // Candidates: the matched audience first, then the any-day tips. A tip seen
  // in the last 14 days is skipped, except today's own pick (so a reload
  // doesn't swap the tip under the user).
  const fresh = (t: { id: string }) => !seenBefore.has(t.id) || shownToday.has(t.id);
  const specific = library.filter((t) => audience !== "any" && t.audience === audience);
  const anyDay = library.filter((t) => t.audience === "any");
  const insight = factorInsight(logs, today);

  const ordered: { tip: CoachTip; why: string }[] = [];
  const add = (list: readonly CoachTip[], w: string) => {
    for (const t of list) if (!ordered.some((o) => o.tip.id === t.id)) ordered.push({ tip: t, why: w });
  };
  // The day's rotation: a seeded start point, so it is the same all day.
  const rotate = <T,>(list: T[], salt: number): T[] => {
    if (list.length === 0) return [];
    const i = Math.floor(seededRandom(seedOf(today) + salt)() * list.length);
    return [...list.slice(i), ...list.slice(0, i)];
  };
  const everyday = "A tip for any day.";
  const insightFresh = insight !== null && fresh(insight.tip);

  // With no recent pattern the insight takes its turn first; with one, the
  // pattern's tips lead and the insight waits behind "Another tip".
  if (insight && insightFresh && audience === "any") add([insight.tip], insight.why);
  add(rotate(specific.filter(fresh), 0), why);
  add(rotate(anyDay.filter(fresh), 1), everyday);
  if (insight && insightFresh) add([insight.tip], insight.why);
  // Everything has been seen: start over rather than go quiet.
  if (ordered.length === 0) {
    add(rotate(specific, 0), why);
    add(rotate(anyDay, 1), everyday);
  }

  // Whatever was already shown today stays the pick, so a reload is calm.
  const primary = ordered.find((o) => shownToday.has(o.tip.id)) ?? ordered[0] ?? null;
  const others = ordered.filter((o) => o !== primary);
  const extra = (insight && insightFresh ? others.find((o) => o.tip.id === insight.tip.id) : undefined) ?? others[0] ?? null;
  return {
    primary: primary ? primary.tip : null,
    why: primary ? primary.why : "",
    extra,
    reminder,
  };
}

// ---------------------------------------------------------------------- gap

type Dated = { log: PoopLog; day: string; at: number };

/**
 * Longer than the user's own usual gap: at least 5 logs, and the days since
 * the last one reach 1.5 x their median gap (never less than 2 days). Someone
 * who normally goes every 3 days isn't "late" on day 3.
 */
function isLongGap(logs: Dated[], today: string): boolean {
  if (logs.length < 5) return false;
  const days = [...new Set(logs.map((x) => x.day))].sort();
  if (days.length < 2) return false;
  const gaps: number[] = [];
  for (let i = 1; i < days.length; i++) gaps.push(daysBetween(days[i - 1], days[i]));
  const threshold = Math.max(2, Math.ceil(1.5 * median(gaps)));
  return daysBetween(days[days.length - 1], today) >= threshold;
}

// ------------------------------------------------------------ factor insight

const FACTOR_PHRASE: Record<Factor, string> = {
  hydrated: "being hydrated",
  fiber: "veggies",
  movement: "moving",
  coffee: "coffee",
  stressed: "feeling stressed",
  poor_sleep: "poor sleep",
  alcohol: "alcohol",
  spicy: "spicy food",
};

export const INSIGHT_MIN_DAYS = 8;
const INSIGHT_MIN_DIFF = 0.5;
const INSIGHT_WINDOW_DAYS = 60;

/**
 * Does one factor line up with softer or firmer logs? Compares the average
 * type on days with it and without it, and only speaks with 8+ days each way.
 * A correlation in the user's own diary, worded as one, never a cause.
 */
export function factorInsight(logs: Dated[], today: string): { tip: CoachTip; why: string } | null {
  const from = addDays(today, -(INSIGHT_WINDOW_DAYS - 1));
  const byDay = new Map<string, PoopLog[]>();
  for (const x of logs) {
    if (x.day < from || x.day > today) continue;
    byDay.set(x.day, [...(byDay.get(x.day) ?? []), x.log]);
  }
  let best: { factor: Factor; diff: number; withDays: number; withoutDays: number } | null = null;
  for (const f of FACTOR_LIST) {
    const withAvg: number[] = [];
    const withoutAvg: number[] = [];
    for (const dayLogs of byDay.values()) {
      const avg = dayLogs.reduce((s, l) => s + l.stool_type, 0) / dayLogs.length;
      (dayLogs.some((l) => l.factors.includes(f.key)) ? withAvg : withoutAvg).push(avg);
    }
    if (withAvg.length < INSIGHT_MIN_DAYS || withoutAvg.length < INSIGHT_MIN_DAYS) continue;
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const diff = mean(withAvg) - mean(withoutAvg);
    if (Math.abs(diff) < INSIGHT_MIN_DIFF) continue;
    if (!best || Math.abs(diff) > Math.abs(best.diff)) {
      best = { factor: f.key, diff, withDays: withAvg.length, withoutDays: withoutAvg.length };
    }
  }
  if (!best) return null;
  return {
    tip: {
      id: `insight-${best.factor}`,
      topic: "insight",
      evidence: "limited",
      text: `On days you logged ${FACTOR_PHRASE[best.factor]}, your logs were ${best.diff > 0 ? "softer" : "firmer"} on average.`,
    },
    why: `Compared ${best.withDays} ${plural(best.withDays, "day", "days")} with it and ${best.withoutDays} without, over the last 60 days.`,
  };
}

// ------------------------------------------------------------------ reminder

function reminderFor(
  logs: Dated[],
  input: CoachInput,
  tz: string,
  today: string,
): { text: string } | null {
  if (input.reminderDismissedDay === today) return null;
  if (input.quietDays.includes(today)) return null;
  if (logs.some((x) => x.day === today)) return null;

  const since = addDays(today, -29);
  const minutes = logs.filter((x) => x.day >= since && x.day <= today).map((x) => minutesOfDay(new Date(x.at), tz));
  if (minutes.length < 7) return null;

  const centre = circularMedian(minutes);
  const spread = median(minutes.map((m) => circularDistance(m, centre)));
  if (spread > REMINDER_MAX_SPREAD_MIN) return null;

  const nowMin = minutesOfDay(input.now, tz);
  if (circularDistance(nowMin, centre) > REMINDER_WINDOW_MIN) return null;
  return { text: REMINDER_TEXT };
}
