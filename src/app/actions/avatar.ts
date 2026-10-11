"use server";

// Save (or clear) the signed-in user's avatar.
import { refresh } from "next/cache";
import { getUser } from "@/lib/auth";
import type { AvatarConfig } from "@/lib/avatar/compose";
import { AvatarSchema } from "@/lib/validation";

export type AvatarResult = { ok: true } | { ok: false; error: string };

/**
 * @param config The chosen parts, or null to go back to the default avatar.
 */
export async function updateAvatar(config: AvatarConfig | null): Promise<AvatarResult> {
  // Only parts that exist and are free get through. The database checks the
  // shape again, but not the ids (see 0006_avatar.sql for why).
  const parsed = config === null ? null : AvatarSchema.safeParse(config);
  if (parsed && !parsed.success) return { ok: false, error: "Something in that avatar looks off. Try again?" };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Your session ran out. Please sign in again." };

  // .select().single() so a write that changed no row is an error, not "Saved".
  const { error } = await supabase
    .from("profiles")
    .update({ avatar: parsed ? parsed.data : null })
    .eq("id", user.id)
    .select("id")
    .single();
  if (error) {
    // The avatar column comes from 0006_avatar.sql. Until that has been run,
    // trying again won't help, so say what's actually missing.
    if (error.code === "PGRST204" || error.code === "42703") {
      console.warn("profiles.avatar unavailable:", error.message);
      return { ok: false, error: "Avatars aren't switched on for this garden yet. (Your own copy? Run supabase/migrations/0006_avatar.sql.)" };
    }
    return { ok: false, error: "Couldn't save your avatar. Try again?" };
  }

  // Same as the name change: nothing is cached, so refreshing the router is
  // what makes the nav, Settings and friends screens show the new look.
  refresh();
  return { ok: true };
}
