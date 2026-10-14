"use server";

import { refresh } from "next/cache";
import { getUser } from "@/lib/auth";
import { categoryOf } from "@/lib/bristol";
import {
  LogEditSchema, LogSchema, UuidSchema, isRecentLogTime, type LogEditInput, type LogInput,
} from "@/lib/validation";
import type { StoolCategory, StoolType } from "@/lib/types";

export type CreateLogResult =
  | { ok: true; category: StoolCategory; day: string }
  | { ok: false; error: string };

const TOO_OLD = "That time doesn't work. Pick a time today or yesterday.";

export async function createLog(input: LogInput): Promise<CreateLogResult> {
  const parsed = LogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something in that log looks off. Try again?" };
  // Today or yesterday only: an older day that was missed stays missed.
  // The database checks the same thing (0007_recent_only.sql).
  if (!isRecentLogTime(parsed.data.logged_at)) return { ok: false, error: TOO_OLD };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Your session ran out. Please sign in again." };

  const { local_day, ...log } = parsed.data;
  // user_id isn't sent: the column defaults to auth.uid() and clients aren't
  // allowed to write it anyway.
  const { error } = await supabase.from("poop_logs").insert(log);
  if (error) {
    if (error.code === "53400") return { ok: false, error: "That's a lot of logs today! Try again tomorrow." };
    if (error.code === "22007") return { ok: false, error: TOO_OLD };
    return { ok: false, error: "Couldn't save that one. Try again?" };
  }

  // A movement replaces any quiet day marked earlier for the same day.
  await supabase.from("quiet_days").delete().eq("day", local_day);

  refresh();
  return { ok: true, category: categoryOf(log.stool_type as StoolType), day: local_day };
}

export type UpdateLogResult =
  | { ok: true; category: StoolCategory; day: string | null }
  | { ok: false; error: string };

/**
 * Change a log that already exists. Type, colour, habits and note can change on
 * any log. A new time (`logged_at` + `local_day`) must be today or yesterday,
 * like a new log; leave both out to keep the log's own time. RLS limits this
 * to the caller's own rows, and the column grants mean only these five columns
 * can be written, so user_id can't be.
 */
export async function updateLog(id: string, input: LogEditInput): Promise<UpdateLogResult> {
  const idOk = UuidSchema.safeParse(id);
  const parsed = LogEditSchema.safeParse(input);
  if (!idOk.success || !parsed.success) return { ok: false, error: "Something in that log looks off. Try again?" };
  const { local_day, logged_at, ...fields } = parsed.data;
  if (logged_at && !isRecentLogTime(logged_at)) return { ok: false, error: TOO_OLD };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Your session ran out. Please sign in again." };

  // .select().single() so "no row was changed" is an error, not a quiet "Saved".
  const { data, error } = await supabase
    .from("poop_logs")
    .update(logged_at ? { ...fields, logged_at } : fields)
    .eq("id", idOk.data)
    .select("category")
    .single();
  if (error || !data) {
    if (error?.code === "22007") return { ok: false, error: TOO_OLD };
    return { ok: false, error: "Couldn't save that change. Try again?" };
  }

  // Moved onto a day: that day has a movement now, so it isn't a quiet day.
  if (local_day) await supabase.from("quiet_days").delete().eq("day", local_day);

  refresh();
  return { ok: true, category: data.category as StoolCategory, day: local_day ?? null };
}

export async function deleteLog(id: string): Promise<{ ok: boolean }> {
  const parsed = UuidSchema.safeParse(id);
  if (!parsed.success) return { ok: false };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false };

  // RLS makes sure this can only ever touch the caller's own row.
  const { error } = await supabase.from("poop_logs").delete().eq("id", parsed.data);
  refresh();
  return { ok: !error };
}
