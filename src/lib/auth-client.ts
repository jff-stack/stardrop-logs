"use client";

// Sign in / sign up / reset request run in the browser on purpose: Supabase
// rate-limits these per IP address, and calling them from our server would
// make every user look like they come from the same few Vercel IPs.
// The 18+ rule is still enforced by the database trigger either way.
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { EmailSchema, LoginSchema, SignUpSchema, isOldEnough, parseDob, safeNext } from "@/lib/validation";

export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type Router = { replace: (href: string) => void; refresh: () => void };

const fieldErrors = (err: z.ZodError): FormState => ({ fieldErrors: z.flattenError(err).fieldErrors });

export async function signUpInBrowser(form: FormData, router: Router): Promise<FormState> {
  const parsed = SignUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);

  const { email, password, dob, display_name, gender } = parsed.data;
  if (!isOldEnough(parseDob(dob)!)) {
    router.replace("/age-restricted");
    return {};
  }

  const { data, error } = await createClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: { dob, display_name, gender },
    },
  });

  if (error) {
    // The age-gate trigger shows up as a generic database error.
    if (/database error/i.test(error.message)) {
      router.replace("/age-restricted");
      return {};
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: ["Pick a stronger password (mix letters, numbers, symbols)."] } };
    }
    if (error.status === 429) return { error: "Too many tries. Take a breather and try again in a bit." };
    return { error: "Couldn't create your account right now. Try again in a moment?" };
  }

  // Email confirmation off -> signed in straight away.
  if (data.session) {
    router.replace("/");
    router.refresh();
  } else {
    router.replace("/check-email");
  }
  return {};
}

export async function signInInBrowser(form: FormData, router: Router): Promise<FormState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);

  const { error } = await createClient().auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.status === 429) return { error: "Too many tries. Take a breather and try again in a bit." };
    // Same message either way so we don't reveal which emails have accounts.
    return { error: "That email and password didn't match (or the email isn't confirmed yet)." };
  }
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
