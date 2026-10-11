"use client";

// Sign in / sign up / reset request run in the browser on purpose: Supabase
// rate-limits these per IP address, and calling them from our server would
// make every user look like they come from the same few Vercel IPs.
// The 18+ rule is still enforced by the database trigger either way.
//
// Nothing here may behave differently depending on whether an email already
// has an account. That's why sign-up always ends on /check-email and the
// messages below never say "already registered" or "no such account".
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { forgetPending, lastSentAt, markSent, rememberPending, secondsLeft } from "@/lib/pending-confirm";
import { EmailSchema, LoginSchema, SignUpSchema, isOldEnough, parseDob, safeNext } from "@/lib/validation";

export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // What to show in the inputs after the action.
  values?: Record<string, string>;
};

type Router = { replace: (href: string) => void; refresh: () => void };
type AuthError = { code?: string; status?: number; message: string };

const fieldErrors = (err: z.ZodError): FormState => ({ fieldErrors: z.flattenError(err).fieldErrors });

const TOO_MANY = "Too many tries. Try again in a minute.";

// Supabase only refuses with this when it was about to send an email, which
// it doesn't do for an address that's already confirmed. Showing it would
// say something about the address, so it's treated like a normal send.
const isEmailRateLimit = (error: AuthError) => error.code === "over_email_send_rate_limit";
// This one is counted per visitor, not per address, so it's safe to show.
const isVisitorRateLimit = (error: AuthError) => error.status === 429 && !isEmailRateLimit(error);
// Only seen if "Confirm email" is switched off in Supabase.
const isAlreadyRegistered = (error: AuthError) =>
  error.code === "user_already_exists" || error.code === "email_exists";

// The confirmation email comes back here. ?type=signup is how /auth/callback
// knows the code was for a sign-up (only the default templates use this; ours
// link to /auth/confirm).
const confirmRedirect = () => `${window.location.origin}/auth/callback?type=signup`;

export async function signUpInBrowser(form: FormData, router: Router): Promise<FormState> {
  const parsed = SignUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);

  const { email, password, dob, display_name, gender } = parsed.data;
  if (!isOldEnough(parseDob(dob)!)) {
    router.replace("/age-restricted");
    return {};
  }

  const { error } = await createClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: confirmRedirect(),
      data: { dob, display_name, gender },
    },
  });

  if (error && !isEmailRateLimit(error) && !isAlreadyRegistered(error)) {
    // The age-gate trigger shows up as a generic database error.
    if (/database error/i.test(error.message)) {
      router.replace("/age-restricted");
      return {};
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: ["Pick a stronger password (mix letters, numbers, symbols)."] } };
    }
    if (isVisitorRateLimit(error)) return { error: TOO_MANY };
    return { error: "Couldn't create your account right now. Try again in a moment?" };
  }

  // Same next step for a new address, one that already has an account, and
  // one still waiting to be confirmed.
  rememberPending(email);
  markSent();
  router.replace("/check-email");
  return {};
}

export async function signInInBrowser(form: FormData, router: Router): Promise<FormState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);

  const { error } = await createClient().auth.signInWithPassword(parsed.data);
  if (error) {
    if (isVisitorRateLimit(error)) return { error: TOO_MANY };
    // One message for a wrong password, an unknown email and an unconfirmed
    // account, so it doesn't reveal which emails have accounts.
    return { error: "Email or password is incorrect. Just signed up? Confirm your email first." };
  }
  forgetPending();
  router.replace(safeNext(form.get("next")?.toString()));
  router.refresh();
  return {};
}

export async function requestResetInBrowser(form: FormData): Promise<FormState> {
  const parsed = EmailSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);

  await createClient().auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/reset`,
  });
  // Always the same answer, whether or not the account exists.
  return { message: "If there's an account for that email, a reset link is on its way." };
}

export async function resendConfirmationInBrowser(form: FormData): Promise<FormState> {
  const typed = { email: form.get("email")?.toString() ?? "" };
  const parsed = EmailSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ...fieldErrors(parsed.error), values: typed };

  const { email } = parsed.data;
  const values = { email };
  // The button is disabled during the wait; this covers pressing Enter.
  if (secondsLeft(lastSentAt(), Date.now()) > 0) return { error: TOO_MANY, values };

  const { error } = await createClient().auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: confirmRedirect() },
  });

  if (error && isVisitorRateLimit(error)) return { error: TOO_MANY, values };
  // No status means the request never reached Supabase (offline, blocked).
  if (error && !error.status) return { error: "Couldn't reach the server. Try again in a minute.", values };

  // Everything else gets one answer: sent, nothing to send, or sent too
  // recently all look the same from here.
  rememberPending(email);
  markSent();
  return {
    message: "If that address is waiting to be confirmed, a new link is on its way. You can try again in a minute.",
    values,
  };
}
