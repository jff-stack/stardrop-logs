// Input schemas shared by server actions and tests.
// The database enforces the same rules (CHECK constraints + triggers), so
// these are the friendly first line of defence, not the only one.
import { z } from "zod";
import { MIN_AGE } from "./constants";

export const STOOL_COLORS = [
  "brown", "dark_brown", "light_brown", "green", "yellow", "clay_pale", "red", "black",
] as const;

export const FACTOR_KEYS = [
  "hydrated", "fiber", "movement", "coffee", "stressed", "poor_sleep", "alcohol", "spicy",
] as const;

const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const LogSchema = z.object({
  stool_type: z.number().int().min(1).max(7),
  color: z.enum(STOOL_COLORS),
  factors: z.array(z.enum(FACTOR_KEYS)).max(FACTOR_KEYS.length).transform((f) => [...new Set(f)]),
  logged_at: z.iso.datetime({ offset: true }),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((n) => (n ? n : null)),
  // The user's local calendar day for logged_at, used to clear a quiet day.
  local_day: dayString,
});
export type LogInput = z.input<typeof LogSchema>;

export const DaySchema = dayString;
export const UuidSchema = z.uuid();

/** Whole years between dob and `today`. */
export function ageOn(dob: Date, today = new Date()) {
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

/** Parses YYYY-MM-DD strictly (rejects 2001-02-31 etc). */
export function parseDob(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  if (y < 1900 || date > new Date()) return null;
  return date;
}

const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "That's a bit long, 72 characters max.");

export const SignUpSchema = z.object({
  display_name: z.string().trim().max(24, "Keep it to 24 characters.").optional().default(""),
  email: z.email("That email doesn't look right.").max(254),
  password,
  dob: z.string().refine((s) => parseDob(s) !== null, "Pick your full birthday."),
  agree: z.literal("on", { error: "Please tick the box to continue." }),
});

export const LoginSchema = z.object({
  email: z.email("That email doesn't look right.").max(254),
  password: z.string().min(1, "Enter your password.").max(72),
});

export const EmailSchema = z.object({ email: z.email("That email doesn't look right.").max(254) });
export const PasswordSchema = z.object({ password });
export const ProfileSchema = z.object({
  display_name: z.string().trim().min(1, "Pick a name.").max(24, "Keep it to 24 characters."),
});

/** True when someone with this dob is old enough to sign up. */
export const isOldEnough = (dob: Date, today = new Date()) => ageOn(dob, today) >= MIN_AGE;

/**
 * Only allow redirects to our own relative paths. Blocks open redirects like
 * "//evil.com", "https://evil.com" and "/\\evil.com".
 */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}
