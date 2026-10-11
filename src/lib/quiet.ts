// Catching up on yesterday.
//
// A day can be filled in today or the day after, and that's it: once a day is
// two days gone it stays as it was, so a missed day really is a missed day.
// (The database enforces the same thing, see 0007_recent_only.sql.)
//
// This file decides what, if anything, to offer for yesterday, and holds the
// wording. The wording is deliberately flat: it says what happened and never
// talks about streaks being saved or protected.
import type { DayStatus } from "./farm";

export const QUIET_COPY = {
  marked: "Marked as a quiet day.",
  removed: "Quiet day removed.",
  /** Under the "quiet day" state on the Today card. */
  todayHint: "Log anytime if things change.",
  yesterdayEmpty: "Yesterday: no check-in",
  yesterdayQuiet: "Yesterday: quiet day",
  markButton: "Mark quiet",
  undoButton: "Undo",
  tooOld: "Quiet days can only be marked for today or yesterday.",
  tooMany: "That's enough changes for one day. Try again tomorrow.",
} as const;

export type YesterdayChoice = { day: string; action: "mark" | "undo" };

interface DayLike {
  day: string;
  status: DayStatus;
  isToday: boolean;
}

/**
 * What to offer for yesterday, from the garden's days (oldest first, today last).
 *
 *   missed -> "mark"   (only if they'd already started before yesterday; a
 *                       brand-new garden isn't asked about a day before it existed)
 *   quiet  -> "undo"
 *   logged -> nothing: a day with a log can't also be a quiet day
 *
 * Nothing older than yesterday is ever offered.
 */
export function yesterdayChoice(days: readonly DayLike[], startedBefore: boolean): YesterdayChoice | null {
  const today = days.at(-1);
  const yesterday = days.at(-2);
  if (!today?.isToday || !yesterday) return null;
  if (yesterday.status === "quiet") return { day: yesterday.day, action: "undo" };
  if (yesterday.status === "missed" && startedBefore) return { day: yesterday.day, action: "mark" };
  return null;
}

/** True if there is any check-in on a day before `day` (a day key). */
export function hasCheckInBefore(logDays: readonly string[], quietDays: readonly string[], day: string): boolean {
  return logDays.some((d) => d < day) || quietDays.some((d) => d < day);
}
