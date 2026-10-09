"use server";

// Account actions that need the signed-in user. Sign in / sign up / reset
// request live in lib/auth-client.ts (see the note there about rate limits).

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PasswordSchema, ProfileSchema } from "@/lib/validation";

export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const fieldErrors = (err: z.ZodError) => ({ fieldErrors: z.flattenError(err).fieldErrors });

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welcome");
}

export async function updatePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = PasswordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);

  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/reset");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { error: "That's your current password. Pick a new one!" };
    return { error: "Couldn't update your password. The link may have expired." };
  }
  redirect("/?pw=updated");
}

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = ProfileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);

  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/settings");

  const { display_name, gender } = parsed.data;
  let { error } = await supabase.from("profiles").update({ display_name, gender }).eq("id", user.id);
  // Before 0003_gender.sql runs there's no gender column; still save the name.
  if (error?.code === "PGRST204" || error?.code === "42703") {
    ({ error } = await supabase.from("profiles").update({ display_name }).eq("id", user.id));
  }
  if (error) return { error: "Couldn't save that. Try again?" };
  refresh();
  return { message: "Saved! Mia will say hi the new way." };
}

export async function deleteAccount(_prev: FormState, form: FormData): Promise<FormState> {
  if (form.get("confirm") !== "DELETE") {
    return { fieldErrors: { confirm: ["Type DELETE (in capitals) to confirm."] } };
  }

  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/settings");

  // Removes the auth user; profile, logs and quiet days cascade with it.
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "Couldn't delete your account. Please try again." };

  await supabase.auth.signOut();
  redirect("/welcome?bye=1");
}
