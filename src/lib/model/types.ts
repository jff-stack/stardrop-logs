// The shape of a "pattern model": something that looks at one person's
// history and guesses what's normal for them.
//
// Today the only implementation is a simple baseline (plain statistics, see
// baseline.ts). A trained, personalised model can be dropped in later as long
// as it implements this interface. Nothing in the app depends on it yet.
import type { StoolType } from "@/lib/types";

/** One day of history, stripped down to what a model needs. No notes, no ids. */
export interface DayFeatures {
  /** YYYY-MM-DD, local. */
  day: string;
  /** 0 = Sunday ... 6 = Saturday. */
  weekday: number;
  count: number;
  quiet: boolean;
  /** Average Bristol type that day, null if no logs. */
  avgType: number | null;
  healthy: number;
  dry: number;
  loose: number;
  /** Local hour of the first log, null if none. */
  firstHour: number | null;
  /** Habit flags seen on any log that day. */
  factors: Record<string, boolean>;
}

export type Confidence = "none" | "low" | "medium" | "high";

export interface PatternGuess {
  /** Typical movements per day for this person. */
  perDay: number | null;
  /** Hour of day they usually go (0-23). */
  usualHour: number | null;
  /** Most common Bristol type. */
  typicalType: StoolType | null;
  /** Share of logged days that were healthy, 0-1. */
  healthyShare: number | null;
  /** How much history the guess is based on. */
  confidence: Confidence;
}

export interface PatternModel {
  /** Short id, handy for logging which model produced a guess. */
  readonly id: string;
  predict(days: DayFeatures[]): PatternGuess;
}
