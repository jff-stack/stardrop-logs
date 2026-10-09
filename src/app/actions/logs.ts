"use server";

import { refresh } from "next/cache";
import { getUser } from "@/lib/auth";
import { categoryOf } from "@/lib/bristol";
import { LogSchema, UuidSchema, type LogInput } from "@/lib/validation";
import type { StoolCategory, StoolType } from "@/lib/types";

export type CreateLogResult =
  | { ok: true; category: StoolCategory; day: string }
  | { ok: false; error: string };

export async function createLog(input: LogInput): Promise<CreateLogResult> {
  const parsed = LogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something in that log looks off. Try again?" };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Your session ran out. Please sign in again." };

  const { local_day, ...log } = parsed.data;
  // user_id isn't sent: the column defaults to auth.uid() and clients aren't
  // allowed to write it anyway.
  const { error } = await supabase.from("poop_logs").insert(log);
  if (error) {
    if (error.code === "53400") return { ok: false, error: "That's a lot of logs today! Try again tomorrow." };
    if (error.code === "22007") return { ok: false, error: "That time doesn't work. Pick something in the past year." };
    return { ok: false, error: "Couldn't save that one. Try again?" };
  }

  // A movement replaces any quiet day marked earlier for the same day.
  await supabase.from("quiet_days").delete().eq("day", local_day);

  refresh();
  return { ok: true, category: categoryOf(log.stool_type as StoolType), day: local_day };
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
