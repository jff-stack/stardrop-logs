"use server";

// Quiet days = "checked in, no movement today". The client sends its local
// date; the database checks the range, uniqueness and ownership.
import { refresh } from "next/cache";
import { getUser } from "@/lib/auth";
import { DaySchema } from "@/lib/validation";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function markQuietDay(day: string): Promise<ActionResult> {
  const parsed = DaySchema.safeParse(day);
  if (!parsed.success) return { ok: false, error: "That date looks off." };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const { error } = await supabase.from("quiet_days").insert({ day: parsed.data });
  // 23505 means it's already marked, which is fine.
  if (error && error.code !== "23505") {
    return { ok: false, error: "Couldn't save your quiet day. Try again?" };
  }
  refresh();
  return { ok: true };
}

export async function undoQuietDay(day: string): Promise<ActionResult> {
  const parsed = DaySchema.safeParse(day);
  if (!parsed.success) return { ok: false, error: "That date looks off." };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const { error } = await supabase.from("quiet_days").delete().eq("day", parsed.data);
  if (error) return { ok: false, error: "Couldn't undo that. Try again?" };
  refresh();
  return { ok: true };
}
