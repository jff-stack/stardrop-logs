// How long someone stays signed in on a browser: until they sign out.
//
// The session lives in a cookie that lasts as long as browsers allow
// (400 days) and is pushed forward every time the token refreshes, so anyone
// who opens the app now and then never gets asked to sign in again. Signing
// out (or deleting the account) clears it straight away. The cookie is
// per-browser, so other devices need their own sign-in.
//
// For this to hold, don't turn on "Time-box user sessions" or "Inactivity
// timeout" in Supabase (Authentication > Sessions).
export const SESSION_MAX_AGE = 400 * 24 * 60 * 60;

export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: SESSION_MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};
