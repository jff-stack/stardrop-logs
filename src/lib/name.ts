// One clean-up for the display name, used by both sign-up and Settings so the
// two can't drift apart. The database does the same thing in
// clean_display_name() (supabase/migrations/0004_name_rules.sql); change both
// together.

export const NAME_MAX = 24;

/**
 * Tidies a typed name: tabs, newlines and odd spaces become one plain space,
 * invisible control characters are dropped, and the ends are trimmed.
 * Zero-width joiners are left alone so family and flag emoji stay in one piece.
 */
export function normaliseName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .replace(/\p{Cc}/gu, "")
    // Dropping a control character can leave two spaces side by side.
    .replace(/ {2,}/g, " ")
    .trim();
}
