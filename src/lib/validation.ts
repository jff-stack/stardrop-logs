// Input schemas shared by server actions and tests.
// The database enforces the same rules (CHECK constraints + triggers), so
// these are the friendly first line of defence, not the only one.
import { z } from "zod";
import { AVATAR_SLOTS, partsFor, type AvatarSlot } from "./avatar/parts";
import { isFriendCode, normaliseFriendCode } from "./friend-link";
import { SHARE_LEVELS } from "./friends";
import { GENDERS } from "./greeting";
import { NUDGE_KINDS } from "./nudges";
import { MIN_AGE } from "./constants";
import { addDays } from "./dates";
import { NAME_MAX, normaliseName } from "./name";

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

// Catch-up window: today and yesterday, nothing older. The server can't know
// the user's timezone, so these two use the same timezone-proof bounds as the
// database (0007_recent_only.sql). The app itself only ever offers the user's
// own today and yesterday, which always fall inside them.

/** A log's time: no more than 50 hours ago, no more than 5 minutes ahead. */
export function isRecentLogTime(iso: string, now = new Date()): boolean {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return t >= now.getTime() - 50 * 3_600_000 && t <= now.getTime() + 5 * 60_000;
}

/** A quiet day: from 2 days before the UTC date to 1 day after it. */
export function isRecentQuietDay(day: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  // Rejects dates that don't exist, like 2026-02-31.
  if (addDays(day, 0) !== day) return false;
  const utcToday = now.toISOString().slice(0, 10);
  return day >= addDays(utcToday, -2) && day <= addDays(utcToday, 1);
}
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

/** Foo@X.com and foo@x.com are the same inbox, so they must be the same account. */
export const normaliseEmail = (raw: string) => raw.trim().toLowerCase();

// Tidied first, then checked. Used by sign-up, sign-in and the reset and
// resend forms. A +tag is left alone: that's a different address.
const email = z
  .string()
  .transform(normaliseEmail)
  .pipe(z.email("That email doesn't look right.").max(254));

const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "That's a bit long, 72 characters max.");

// Clean the name first, then measure it, so stray spaces don't count.
const cleanName = z.string().transform(normaliseName);
const nameLength = z.string().max(NAME_MAX, `Keep it to ${NAME_MAX} characters.`);

export const SignUpSchema = z.object({
  // Empty is fine here: the sign-up trigger falls back to "Farmer".
  display_name: cleanName.pipe(nameLength).optional().default(""),
  email,
  password,
  dob: z.string().refine((s) => parseDob(s) !== null, "Pick your full birthday."),
  gender: z.enum(GENDERS).optional().default("other"),
  agree: z.literal("on", { error: "Please tick the box to continue." }),
});

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(72),
});

export const EmailSchema = z.object({ email });
export const PasswordSchema = z.object({ password });
export const ProfileSchema = z.object({
  display_name: cleanName.pipe(nameLength.min(1, "Pick a name.")),
  gender: z.enum(GENDERS).optional().default("other"),
});

// A stretch of history for the Insights calendar: one month plus a day of
// padding each side, so never more than 45 days. Not before the app existed,
// and not further ahead than the day after tomorrow.
const DAY_MS = 86_400_000;
export const MonthRangeSchema = z
  .object({ from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }) })
  .refine((r) => Date.parse(r.to) > Date.parse(r.from))
  .refine((r) => Date.parse(r.to) - Date.parse(r.from) <= 45 * DAY_MS)
  .refine((r) => Date.parse(r.from) >= Date.UTC(2020, 0, 1))
  .refine((r) => Date.parse(r.to) <= Date.now() + 2 * DAY_MS);

// Friends. The database functions check all of this again.
export const FriendCodeSchema = z.string().max(64).transform(normaliseFriendCode).refine(isFriendCode);
export const RespondSchema = z.object({ id: z.uuid(), accept: z.boolean() });
export const NudgeSchema = z.object({ friendId: z.uuid(), kind: z.enum(NUDGE_KINDS) });
export const SharingSchema = z.object({ share_level: z.enum(SHARE_LEVELS), accept_nudges: z.boolean() });
// Shaped like an IANA name ("Europe/London"). Postgres decides if it's real.
export const TimezoneSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9_+\-/]+$/);

// Avatar: exactly the nine keys, and each choice must be a part that exists
// in that slot AND is free. (When the shop arrives, "free" becomes "free or
// owned", checked on the server.) The database only checks the shape, on
// purpose; see 0006_avatar.sql.
const freeIds = (slot: AvatarSlot) => partsFor(slot).filter((p) => p.free).map((p) => p.id);
const slotChoice = (slot: AvatarSlot) => z.string().refine((id) => freeIds(slot).includes(id));
export const AvatarSchema = z.strictObject({
  v: z.literal(1),
  ...(Object.fromEntries(AVATAR_SLOTS.map((slot) => [slot, slotChoice(slot)])) as Record<
    AvatarSlot,
    ReturnType<typeof slotChoice>
  >),
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
