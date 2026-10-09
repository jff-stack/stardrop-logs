// "Is this normal?" for how often someone goes.
//
// The usual rule of thumb is anywhere from 3 times a day to 3 times a week,
// with type 3-4 being the comfy middle. So the answer depends on how many
// times today, whether those were loose or dry, and the colour.
// This is a general rule of thumb, never a diagnosis: anything unusual
// points the person to a doctor.
import { COLORS } from "./colors";
import { dayKey, daysAgo } from "./dates";
import type { PoopLog } from "./types";

export type RhythmLevel = "great" | "okay" | "watch" | "talk";

export interface Rhythm {
  level: RhythmLevel;
  title: string;
  detail: string;
}

/** Up to this many a day is still in the everyday range. */
export const NORMAL_MAX_PER_DAY = 3;

/** Logs that landed on the same local day as `now`. */
export function logsOn(logs: PoopLog[], now: Date): PoopLog[] {
  const today = dayKey(now);
  return logs.filter((l) => dayKey(new Date(l.logged_at)) === today);
}

/** Average movements per day over the last `days` days (today included). */
export function averagePerDay(logs: PoopLog[], now: Date, days = 7): number {
  const start = daysAgo(days - 1, now).getTime();
  const count = logs.filter((l) => new Date(l.logged_at).getTime() >= start).length;
  return Math.round((count / days) * 10) / 10;
}

/** A friendly read on today's count + consistency. */
export function todayRhythm(today: PoopLog[]): Rhythm {
  const n = today.length;
  const loose = today.filter((l) => l.category === "loose").length;
  const watery = today.some((l) => l.stool_type === 7);
  const dry = today.filter((l) => l.category === "dry").length;

  if (today.some((l) => COLORS[l.color].checkIn)) {
    return {
      level: "talk",
      title: "Please check in with a doctor",
      detail:
        "You logged a colour that a doctor should look at. This app can't tell you what it means, so please book a visit, and seek urgent care if you feel unwell.",
    };
  }
  if (loose >= 3 || (watery && n >= 3)) {
    return {
      level: "talk",
      title: "A rainy day for your tummy",
      detail:
        "Several loose ones today. Please see a doctor if it lasts more than 2 days, or straight away if you see blood, have a fever or feel very unwell.",
    };
  }
  if (n > NORMAL_MAX_PER_DAY) {
    return {
      level: "watch",
      title: `${n} times is a busy day`,
      detail:
        "That's more than the usual 3 a day. If it keeps happening, or you feel unwell, please see a doctor.",
    };
  }
  if (loose >= 2) {
    return {
      level: "watch",
      title: "A little on the loose side",
      detail: "Keep sipping water today. If it doesn't settle or you feel unwell, please see a doctor.",
    };
  }
  if (dry > 0 && dry === n) {
    return {
      level: "okay",
      title: "Normal count, a bit dry",
      detail: "Going is great! Extra water and some fruit or veggies can make it easier.",
    };
  }
  if (n === 1) {
    return { level: "great", title: "Right on track", detail: "Once a day is a lovely rhythm." };
  }
  return {
    level: "great",
    title: `${n} today is totally normal`,
    detail: "Anywhere from 3 times a day to 3 times a week is the everyday range.",
  };
}
