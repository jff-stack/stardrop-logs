// What Mia says on the Garden screen: a status line first, then a nudge or two
// and a tip. Warm, never preachy, and not medical advice.
import { timeOfDay } from "./dates";
import { heyFor, type Gender } from "./greeting";
import type { BadgeStats } from "./badges";
import type { Garden } from "./farm";
import { CHECK_IN_AFTER_DAYS } from "./suggestions";
import type { PoopLog } from "./types";

const GREETINGS = {
  morning: ["Good morning, {name}!", "Rise and shine, {name}!"],
  afternoon: ["Good afternoon, {name}!", "Happy afternoon, {name}!"],
  evening: ["Good evening, {name}!", "Cozy evening, {name}?"],
  night: ["Up late, {name}?", "The stars are out, {name}!"],
};

const TIPS = [
  "Water is the garden's best friend. Try a glass with every meal!",
  "Fiber is like compost for your gut: oats, beans, berries, veggies.",
  "A little walk after eating helps things move along.",
  "Your gut loves routine. Same-ish meal times = happier garden.",
  "Stress can make tummies grumpy. A few slow breaths help!",
  "Tap me anytime! I like visitors.",
  "Coffee can speed things up. Good to know, right?",
];

const pick = <T,>(list: readonly T[], seed: number) => list[Math.abs(seed) % list.length];

/**
 * Every way Mia might open: the gendered hey (+ a time-of-day line), a plain
 * "Hi, name!", or just the time-of-day line. One is picked per hour of the
 * day so it varies without flickering between renders.
 */
export function hellos(name: string, gender: Gender, now: Date): string[] {
  const seed = now.getDate() + now.getHours();
  const timed = pick(GREETINGS[timeOfDay(now)], seed).replace("{name}", name);
  return [`${heyFor(gender)} ${timed}`, `Hi ${name}!`, `${heyFor(gender)} Hi ${name}!`, timed];
}

/** The headline line: today's state first, then streak celebrations. */
function statusLine(hello: string, garden: Garden, last: PoopLog | undefined): string {
  const days = garden.daysSinceMovement;

  if (garden.quietToday) {
    return `${hello} Quiet day noted. Rest up, tomorrow's a fresh start!`;
  }
  if (!garden.loggedToday) {
    if (days !== null && days >= CHECK_IN_AFTER_DAYS) {
      return `${hello} It's been ${days} days since your last movement. If you're uncomfortable, in pain, or it keeps going, please see a doctor.`;
    }
    return `${hello} Haven't gone yet? Totally okay! I left a few gentle ideas below.`;
  }
  if (garden.prizeStreak >= 7) return `${hello} ${garden.prizeStreak} prize days in a row! A stardrop bloomed!`;
  if (garden.prizeStreak >= 3) return `${hello} ${garden.prizeStreak} prize days running. The pumpkins are blushing!`;
  if (last?.category === "healthy") return `${hello} Today's harvest looks lovely. Proud of you!`;
  return `${hello} Thanks for checking in. Every log helps the garden grow.`;
}

export function dashboardLines(
  name: string,
  gender: Gender,
  garden: Garden,
  logs: PoopLog[],
  now = new Date(),
): string[] {
  const seed = now.getDate() + now.getHours();
  const hello = pick(hellos(name, gender, now), seed + now.getMonth());
  const last = logs[0];
  const lines = [statusLine(hello, garden, last)];

  // Streak cheer.
  if (garden.streak.current >= 3) {
    lines.push(`That's a ${garden.streak.current}-day check-in streak. You're so consistent!`);
  }

  // Gentle nudge based on the latest movement.
  if (last?.category === "dry") {
    lines.push("Things were a bit dry lately. Extra water and some fruit might help!");
  } else if (last?.category === "loose") {
    lines.push("A rainy spell? Sip water and rest up. If it lasts, please see a doctor.");
  }

  lines.push(pick(TIPS, seed), pick(TIPS, seed + 3));
  return [...new Set(lines)];
}

/** Mia on the badges page. Cheerful about what's there, relaxed about what isn't. */
export function badgesLines(stats: BadgeStats, earned: number, total: number): string[] {
  if (stats.daysCheckedIn === 0) {
    return [
      "This is the badge shelf! Your first log puts the first one on it.",
      "No rush at all. They'll be here whenever you are.",
    ];
  }
  const first =
    earned === total
      ? "Every single badge! The shelf is full and I'm so proud."
      : `${earned} on the shelf so far. I polish them every morning!`;
  return [
    first,
    "Quiet days count for streaks too. Resting is part of gardening.",
    "Tap a badge and I'll tell you what it's for.",
  ];
}

/** Mia on the Friends screen. Never compares anyone with anyone. */
export function friendsLines(friends: number, incoming: number): string[] {
  const lines: string[] = [];
  if (incoming > 0) lines.push("Someone would like to be garden friends! Have a look below.");
  if (friends === 0) {
    lines.push("Friends are optional, and it's cozy either way. Send your link to someone you'd like to wave at.");
  } else {
    lines.push("Here are your garden friends. A sparkle means they checked in today.");
    lines.push("Someone resting? That's all it means. Send a nudge if you fancy saying hi.");
  }
  lines.push("Friends never see what you logged. Only what you pick under 'What friends see'.");
  return lines;
}

/** Lines for visitors looking at the sample farm. */
export const DEMO_LINES = [
  "Hey there! I'm Mia. This is a sample garden. Tap me to hear more!",
  "Every log plants a crop. Healthy days grow parsnips and pumpkins!",
  "No movement today? Tap 'Quiet day' to check in anyway.",
  "Tap 'Try a log' to see how quick logging is. Nothing gets saved!",
  "Sign up and I'll keep your real garden, charts and streak.",
  "Your logs are private, just between you and your garden.",
];
