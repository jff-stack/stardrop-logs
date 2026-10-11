// Where an email link sends someone once we know whether it checked out.
// Kept apart from the route handlers so it can be tested on its own.
import { safeNext } from "./validation";

/** The link types Supabase can send that we're willing to verify. */
export const KNOWN_TYPES = ["signup", "email", "recovery", "email_change", "invite", "magiclink"] as const;
export type KnownType = (typeof KNOWN_TYPES)[number];

// "email" is what our confirm-signup template sends. Nothing else in the app
// uses it (there's no magic-link or email-code sign-in).
const CONFIRM_TYPES: readonly string[] = ["signup", "email"];

export const VERIFIED_PATH = "/email-verified";
export const ERROR_PATH = "/auth/error";

export const isKnownType = (type: string | null | undefined): type is KnownType =>
  (KNOWN_TYPES as readonly string[]).includes(type ?? "");

interface ConfirmInput {
  /** "token" = /auth/confirm (?token_hash=), "code" = /auth/callback (?code=). */
  flow: "token" | "code";
  type: string | null | undefined;
  /** Did Supabase accept the token or code? */
  ok: boolean;
  next?: string | null;
}

interface ConfirmOutcome {
  path: string;
  /**
   * Verifying a link signs the visitor in. For a sign-up confirmation we drop
   * that session again so they land on "Email verified" and sign in
   * themselves (the proxy would bounce a signed-in visitor off /login).
   */
  signOut: boolean;
}

export function confirmDestination({ flow, type, ok, next }: ConfirmInput): ConfirmOutcome {
  if (!ok) return { path: ERROR_PATH, signOut: false };

  const known = isKnownType(type);
  // A token link always says what it's for. A code link only does when we
  // added ?type= ourselves, so no type there is fine.
  if (!known && (flow === "token" || type)) return { path: ERROR_PATH, signOut: false };

  // ?next= is ignored here on purpose: a confirmation always ends on the same page.
  if (known && CONFIRM_TYPES.includes(type)) return { path: VERIFIED_PATH, signOut: true };

  const fallback = type === "recovery" ? "/reset" : type === "email_change" ? "/settings" : "/";
  return { path: safeNext(next, fallback), signOut: false };
}
