// Loads everything the Garden and Insights screens need.
// Queries run as the signed-in user, so RLS limits them to their own rows.
// Signed-out visitors get an empty "sample garden" payload instead.
import "server-only";
import { getUser } from "@/lib/auth";
import { getMyNudges } from "@/lib/data/friends";
import { defaultAvatar, resolveAvatar, type AvatarConfig } from "@/lib/avatar/compose";
import type { createClient } from "@/lib/supabase/server";
import { isGender, type Gender } from "@/lib/greeting";
import type { DashboardData, PoopLog } from "@/lib/types";

// Enough history for the garden, best streak and the 8-week chart.
export const HISTORY_DAYS = 120;

export async function getDashboardData(): Promise<DashboardData> {
  const { supabase, user } = await getUser();
  if (!user) {
    return {
      displayName: "Farmer",
      gender: "other",
      logs: [],
      quietDays: [],
      isDemo: true,
      nudges: [],
      timezone: null,
      tipsEnabled: true,
      remindersEnabled: true,
    };
  }

  const sinceMs = Date.now() - HISTORY_DAYS * 86_400_000;
  const since = new Date(sinceMs).toISOString();
  const sinceDay = since.slice(0, 10);

  const [profile, logs, quiet, nudges, zone] = await Promise.all([
    getProfile(supabase, user.id),
    supabase
      .from("poop_logs")
      .select("id, stool_type, category, color, factors, logged_at, notes")
      .gte("logged_at", since)
      .order("logged_at", { ascending: false })
      .limit(500),
    supabase
      .from("quiet_days")
      .select("day")
      .gte("day", sinceDay)
      .order("day", { ascending: false }),
    // Both come back empty before 0005_friends.sql has run.
    getMyNudges(supabase),
    getZoneAndTipPrefs(supabase, user.id),
  ]);

  if (quiet.error) {
    // Probably 0002_quiet_days.sql hasn't been run yet. Everything else still works.
    console.warn("quiet_days unavailable:", quiet.error.message);
  }

  return {
    displayName: profile.displayName,
    gender: profile.gender,
    logs: (logs.data ?? []) as PoopLog[],
    quietDays: (quiet.data ?? []).map((q: { day: string }) => q.day),
    isDemo: false,
    nudges,
    timezone: zone.timezone,
    tipsEnabled: zone.tipsEnabled,
    remindersEnabled: zone.remindersEnabled,
  };
}

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * The saved timezone and the two tip choices, in one query. Before
 * 0008_tip_prefs.sql the choices don't exist: both read as on, and the
 * timezone is fetched on its own so it still works.
 */
async function getZoneAndTipPrefs(
  supabase: Client,
  id: string,
): Promise<{ timezone: string | null; tipsEnabled: boolean; remindersEnabled: boolean }> {
  const full = await supabase.from("profiles").select("timezone, tips_enabled, reminders_enabled").eq("id", id).single();
  if (!full.error) {
    return {
      timezone: full.data?.timezone ?? null,
      tipsEnabled: full.data?.tips_enabled !== false,
      remindersEnabled: full.data?.reminders_enabled !== false,
    };
  }
  const zone = await supabase.from("profiles").select("timezone").eq("id", id).single();
  return { timezone: zone.error ? null : (zone.data?.timezone ?? null), tipsEnabled: true, remindersEnabled: true };
}

/** The two tip choices for Settings. Both on if 0008 hasn't run (`saved` says so). */
export async function getTipPrefs(
  supabase: Client,
  id: string,
): Promise<{ tipsEnabled: boolean; remindersEnabled: boolean; saved: boolean }> {
  const { data, error } = await supabase.from("profiles").select("tips_enabled, reminders_enabled").eq("id", id).single();
  if (error || !data) return { tipsEnabled: true, remindersEnabled: true, saved: false };
  return { tipsEnabled: data.tips_enabled !== false, remindersEnabled: data.reminders_enabled !== false, saved: true };
}

/** Name + gender. Falls back to name only if 0003_gender.sql hasn't run yet. */
export async function getProfile(supabase: Client, id: string): Promise<{ displayName: string; gender: Gender }> {
  const full = await supabase.from("profiles").select("display_name, gender").eq("id", id).single();
  if (!full.error) {
    return {
      displayName: full.data?.display_name ?? "Farmer",
      gender: isGender(full.data?.gender) ? full.data.gender : "other",
    };
  }
  console.warn("profiles.gender unavailable:", full.error.message);
  const basic = await supabase.from("profiles").select("display_name").eq("id", id).single();
  return { displayName: basic.data?.display_name ?? "Farmer", gender: "other" };
}

/**
 * The user's avatar, ready to draw. If they haven't made one (or
 * 0006_avatar.sql hasn't run yet) it's the default worked out from their id.
 */
export async function getAvatar(supabase: Client, id: string): Promise<AvatarConfig> {
  const { data, error } = await supabase.from("profiles").select("avatar").eq("id", id).single();
  return error ? defaultAvatar(id) : resolveAvatar(data?.avatar, id);
}

/**
 * When the user's history starts: their earliest log and earliest quiet day.
 * The calendar uses it to know where "previous month" should stop. Two tiny
 * queries, one row each.
 */
export async function getFirstEntry(supabase: Client): Promise<{ loggedAt: string | null; quietDay: string | null }> {
  const [log, quiet] = await Promise.all([
    supabase.from("poop_logs").select("logged_at").order("logged_at", { ascending: true }).limit(1),
    supabase.from("quiet_days").select("day").order("day", { ascending: true }).limit(1),
  ]);
  return {
    loggedAt: (log.data?.[0] as { logged_at: string } | undefined)?.logged_at ?? null,
    quietDay: (quiet.data?.[0] as { day: string } | undefined)?.day ?? null,
  };
}

/** Times of the last ~36 hours of logs, so the log screen can count today's. */
export async function getRecentLogTimes(supabase: Client): Promise<string[]> {
  const since = new Date(Date.now() - 36 * 3_600_000).toISOString();
  const { data } = await supabase
    .from("poop_logs")
    .select("logged_at")
    .gte("logged_at", since)
    .order("logged_at", { ascending: false })
    .limit(60);
  return (data ?? []).map((r: { logged_at: string }) => r.logged_at);
}
