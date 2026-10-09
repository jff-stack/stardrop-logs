// Must match public.min_age_years() in supabase/migrations/0001_init.sql.
export const MIN_AGE = 18;

// Max length of a log note (also a CHECK constraint in the database).
export const NOTE_MAX = 500;

// Shown under every main screen and linked from sign-up. Stardrop Logs is a
// diary, nothing more: it never diagnoses, treats or replaces a doctor.
export const MEDICAL_NOTE =
  "Stardrop Logs is a wellness diary, not a medical app. It can't diagnose or treat anything. For any health worry, please see a doctor. In an emergency, call your local emergency number.";
