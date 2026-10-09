// Shared types. Keep these in step with supabase/migrations.
import type { Gender } from "./greeting";
export type StoolType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Derived in the DB (`category` generated column) and in lib/bristol.ts. */
export type StoolCategory = "dry" | "healthy" | "loose";

export type StoolColor =
  | "brown"
  | "dark_brown"
  | "light_brown"
  | "green"
  | "yellow"
  | "clay_pale"
  | "red"
  | "black";

export type Factor =
  | "hydrated"
  | "fiber"
  | "movement"
  | "coffee"
  | "stressed"
  | "poor_sleep"
  | "alcohol"
  | "spicy";

/** A row of public.poop_logs as the app reads it. */
export interface PoopLog {
  id: string;
  stool_type: StoolType;
  category: StoolCategory;
  color: StoolColor;
  factors: Factor[];
  /** ISO timestamp. */
  logged_at: string;
  notes: string | null;
}

/** Everything the dashboard needs, fetched once on the server. */
export interface DashboardData {
  displayName: string;
  /** Only used for Mia's hello. */
  gender: Gender;
  logs: PoopLog[];
  /** Local days (YYYY-MM-DD) the user checked in with no movement. */
  quietDays: string[];
  /** True when showing the sample farm to a signed-out visitor. */
  isDemo: boolean;
}
