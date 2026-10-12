"use server";

// Saves the two tip choices (Tips, Reminders) on the user's own profile.
// The tips themselves are picked in the browser; the server only remembers
// whether the person wants them. Runs as the user, so the database's
// own-row policy and column grants (0008_tip_prefs.sql) are the real limit.
import { refresh } from "next/cache";
import { getUser } from "@/lib/auth";
import { TipPrefsSchema } from "@/lib/validation";

export type TipPrefsResult = { ok: true; message: string } | { ok: false; error: string };

export async function setTipPrefs(input: { tips_enabled: boolean; reminders_enabled: boolean }): Promise<TipPrefsResult> {
  const parsed = TipPrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That didn't work. Try again?" };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Your session ran out. Please sign in again." };

  // .select().single() so a write that changed no row is an error, not "Saved".
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id).select("id").single();
  if (error) {
    // 0008_tip_prefs.sql hasn't been run: the columns don't exist yet.
    if (error.code === "PGRST204" || error.code === "42703") {
      return { ok: false, error: "Tip choices need a database update (0008_tip_prefs.sql) before they can be saved." };
    }
    return { ok: false, error: "Couldn't save that. Try again?" };
  }
  refresh();
  return { ok: true, message: "Saved." };
}
