// Badges, worked out from the log history every time. Nothing here is stored.
//
// The house rules:
//   - A quiet day is a check-in like any other. It keeps streaks going and
//     counts toward "days checked in".
//   - No badge for how many logs fit in a day, for a stool type or colour, or
//     for anything extreme.
//   - A badge, once earned, stays earned for as long as the history backs it.
//     Nothing is taken away for a slow week.
import type { BadgeArtKey } from "./badge-art";
import { runsOf, streaksOf, type CheckIn } from "./checkin";
import { addDays, dayKeyIn } from "./dates";
import { MILESTONES } from "./streak";

export interface BadgeStats {
  currentStreak: number;
  longestStreak: number;
  totalLogs: number;
  /** Days with at least one log. */
  daysLogged: number;
  /** Quiet days that stand (a log on the same day replaces the quiet day). */
  quietDaysUsed: number;
  /** Days with a log or a quiet day. */
  daysCheckedIn: number;
  /** Days checked in out of the last 30, today included. */
  daysLoggedLast30: number;
  /** The most days checked in within any 30 days in a row. */
  bestDaysIn30: number;

  // When things happened, for "earned on". All day keys, oldest first.
  /** The day of each log. logDays[9] is the day of the 10th log. */
  logDays: string[];
  /** Each day checked in. */
  checkInDays: string[];
  quietDays: string[];
  /** streakDays[n - 1] is the day a streak first reached n days. */
  streakDays: string[];
  /** The day 20 check-ins in 30 days was first reached. */
  twentyIn30Day: string | null;
}

const EMPTY: BadgeStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalLogs: 0,
  daysLogged: 0,
  quietDaysUsed: 0,
  daysCheckedIn: 0,
  daysLoggedLast30: 0,
  bestDaysIn30: 0,
  logDays: [],
  checkInDays: [],
  quietDays: [],
  streakDays: [],
  twentyIn30Day: null,
};

const WINDOW = 30;
const WINDOW_GOAL = 20;

/**
 * @param logTimes  ISO timestamps of every log (logged_at), any order.
 * @param quietDays Local day keys (YYYY-MM-DD) marked as quiet days.
 * @param tz        IANA timezone to bucket days in (the browser's).
 */
export function computeStats(logTimes: readonly string[], quietDays: readonly string[], now: Date, tz: string): BadgeStats {
  const today = dayKeyIn(now, tz);
  // Anything dated after today (a clock a few minutes fast) waits until tomorrow.
  const logDays = logTimes.map((t) => dayKeyIn(new Date(t), tz)).filter((d) => d <= today).sort();
  const logged = new Set(logDays);
  // A movement log wins over a quiet day marked for the same day, as in the garden.
  const quiet = [...new Set(quietDays)].filter((d) => d <= today && !logged.has(d)).sort();
  const quietSet = new Set(quiet);
  const checkInDays = [...logged, ...quiet].sort();
  if (checkInDays.length === 0) return EMPTY;

  // Every calendar day from the first check-in to today.
  const days: string[] = [];
  for (let d = checkInDays[0]; d <= today; d = addDays(d, 1)) days.push(d);

  const statuses: CheckIn[] = days.map((d) => {
    if (logged.has(d)) return "movement";
    if (quietSet.has(d)) return "quiet";
    return d === today ? "pending" : "missed";
  });

  const runs = runsOf(statuses);
  const { current, best } = streaksOf(statuses);
  const streakDays: string[] = [];
  runs.forEach((run, i) => {
    if (run > streakDays.length) streakDays.push(days[i]);
  });

  // Check-ins in each 30-day stretch, sliding one day at a time.
  let inWindow = 0;
  let bestDaysIn30 = 0;
  let twentyIn30Day: string | null = null;
  const checked = statuses.map((s) => s === "movement" || s === "quiet");
  checked.forEach((isIn, i) => {
    if (isIn) inWindow++;
    if (i >= WINDOW && checked[i - WINDOW]) inWindow--;
    bestDaysIn30 = Math.max(bestDaysIn30, inWindow);
    if (twentyIn30Day === null && inWindow >= WINDOW_GOAL) twentyIn30Day = days[i];
  });

  return {
    currentStreak: current,
    longestStreak: best,
    totalLogs: logDays.length,
    daysLogged: logged.size,
    quietDaysUsed: quiet.length,
    daysCheckedIn: checkInDays.length,
    daysLoggedLast30: inWindow,
    bestDaysIn30,
    logDays,
    checkInDays,
    quietDays: quiet,
    streakDays,
    twentyIn30Day,
  };
}

export const BADGE_GROUPS = ["Streak", "Getting started", "Consistency", "Just for fun"] as const;
export type BadgeGroup = (typeof BADGE_GROUPS)[number];

export interface Badge {
  id: string;
  group: BadgeGroup;
  name: string;
  /** What it's for. Doubles as the hint while it's locked. */
  description: string;
  artKey: BadgeArtKey;
  /** What the progress counts: "days", "logs"... */
  unit: string;
  progress: (stats: BadgeStats) => { current: number; target: number };
  earned: (stats: BadgeStats) => boolean;
  /** Day key it was earned on, when the history can tell. */
  earnedOn: (stats: BadgeStats) => string | null;
}

/** A badge that is earned once `best` reaches `target`; `now` is the progress shown until then. */
function badge(
  base: Pick<Badge, "id" | "group" | "name" | "description" | "artKey" | "unit">,
  target: number,
  best: (s: BadgeStats) => number,
  when: (s: BadgeStats) => string | null | undefined,
  now: (s: BadgeStats) => number = best,
): Badge {
  const earned = (s: BadgeStats) => best(s) >= target;
  return {
    ...base,
    earned,
    progress: (s) => ({ current: earned(s) ? target : Math.min(now(s), target), target }),
    earnedOn: (s) => (earned(s) ? when(s) ?? null : null),
  };
}

const STREAK_ART: Record<number, BadgeArtKey> = {
  3: "sprout",
  7: "pumpkin",
  14: "stardrop",
  30: "harvest",
  60: "trophy",
  100: "summit",
  200: "evergreen",
  365: "seasons",
};

const streakBadges = MILESTONES.map((m) =>
  badge(
    {
      id: `streak-${m.days}`,
      group: "Streak",
      name: m.name,
      description: `Check in ${m.days} days in a row. Quiet days count too.`,
      artKey: STREAK_ART[m.days] ?? "sprout",
      unit: "days",
    },
    m.days,
    (s) => s.longestStreak,
    (s) => s.streakDays[m.days - 1],
    // While it's locked, show the streak that's running now.
    (s) => s.currentStreak,
  ),
);

const totalLogs = (id: string, group: BadgeGroup, name: string, n: number, artKey: BadgeArtKey, description: string) =>
  badge({ id, group, name, description, artKey, unit: "logs" }, n, (s) => s.totalLogs, (s) => s.logDays[n - 1]);

export const BADGES: Badge[] = [
  ...streakBadges,

  badge(
    { id: "first-log", group: "Getting started", name: "First Seed", description: "Save your first log.", artKey: "seed", unit: "logs" },
    1,
    (s) => s.totalLogs,
    (s) => s.logDays[0],
  ),
  badge(
    {
      id: "first-quiet-day",
      group: "Getting started",
      name: "Moonlit Rest",
      description: "Mark a quiet day. Checking in counts just as much as logging.",
      artKey: "moon",
      unit: "quiet days",
    },
    1,
    (s) => s.quietDaysUsed,
    (s) => s.quietDays[0],
  ),
  badge(
    {
      id: "full-week",
      group: "Getting started",
      name: "A Week's Worth",
      description: "Check in on 7 different days. They don't have to be in a row.",
      artKey: "calendar",
      unit: "days",
    },
    7,
    (s) => s.daysCheckedIn,
    (s) => s.checkInDays[6],
  ),

  badge(
    {
      id: "twenty-of-thirty",
      group: "Consistency",
      name: "Steady Basket",
      description: "Check in on 20 days out of any 30. Days off are part of the plan.",
      artKey: "basket",
      unit: "days",
    },
    WINDOW_GOAL,
    (s) => s.bestDaysIn30,
    (s) => s.twentyIn30Day,
    (s) => s.daysLoggedLast30,
  ),
  totalLogs("logs-10", "Consistency", "Kindling", 10, "stack1", "Save 10 logs, whenever they happen."),
  totalLogs("logs-50", "Consistency", "Woodpile", 50, "stack2", "Save 50 logs, whenever they happen."),
  totalLogs("logs-100", "Consistency", "Log Cabin", 100, "stack3", "Save 100 logs, whenever they happen."),

  totalLogs("poopybutt", "Just for fun", "Poopybutt", 5, "poopGrin", "5 logs in the book. You're officially a poopybutt."),
  totalLogs("number-two", "Just for fun", "Number Two", 22, "poopWink", "22 logs. Two twos for number two."),
  totalLogs("poopmaster69", "Just for fun", "Poopmaster69", 69, "poopKing", "69 logs. Nice."),
];

/** "3 Oct 2026" for a day key, in the reader's own date style. */
export function formatDay(day: string, locale?: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

/** "4 of 7 days" */
export function progressText(b: Badge, stats: BadgeStats): string {
  const { current, target } = b.progress(stats);
  return `${current} of ${target} ${b.unit}`;
}

/** What a screen reader hears: "Sprout, earned on 3 Oct 2026" / "Sprout, locked, 2 of 3 days". */
export function badgeLabel(b: Badge, stats: BadgeStats, locale?: string): string {
  if (!b.earned(stats)) return `${b.name}, locked, ${progressText(b, stats)}`;
  const day = b.earnedOn(stats);
  return day ? `${b.name}, earned on ${formatDay(day, locale)}` : `${b.name}, earned`;
}
