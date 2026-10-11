// Shapes and wording for the friends feature.
//
// Ground rules, which the wording here has to keep to:
//   - Nothing ranks or compares people. Friends are listed by name.
//   - A friend who hasn't logged today is "resting". No "hasn't logged in N
//     days", no streak numbers, nothing that could read as a telling-off.
//   - What a friend may see is decided in the database (get_friends_summary
//     in 0005_friends.sql). This file only describes it.
import type { AvatarConfig } from "./avatar/compose";

export const SHARE_LEVELS = ["off", "active", "counts"] as const;
export type ShareLevel = (typeof SHARE_LEVELS)[number];

export const isShareLevel = (v: unknown): v is ShareLevel =>
  typeof v === "string" && (SHARE_LEVELS as readonly string[]).includes(v);

/** The choices on the sharing screen, in order. */
export const SHARE_OPTIONS: { value: ShareLevel; label: string; detail: string }[] = [
  { value: "off", label: "Nothing", detail: "Friends see your name and avatar, and that's all." },
  { value: "active", label: "That I checked in", detail: "Friends see whether you logged today, and your best streak badge." },
  { value: "counts", label: "How many, too", detail: "Also how many logs today and on each of the last 7 days." },
];

/** Said on the explainer, the sharing settings and the privacy page. */
export const NEVER_SHARED =
  "Never shared with anyone: stool type, colour, habits, notes, the time of day, quiet days, your birthday, gender or email.";

/** One friend, exactly as get_friends_summary() returns it. */
export interface FriendSummary {
  friend_id: string;
  name: string;
  share_level: ShareLevel;
  /** null when they share nothing. */
  logged_today: boolean | null;
  /** null unless they share counts. */
  today_count: number | null;
  /** 7 days, oldest first, today last. null unless they share counts. */
  week_counts: number[] | null;
  /** Badge id (e.g. "streak-7"), or null. */
  best_badge: string | null;
}

export interface FriendRequest {
  id: string;
  direction: "incoming" | "outgoing";
  user_id: string;
  name: string;
}

export interface IncomingNudge {
  id: string;
  kind: string;
  sender_name: string;
  /** The sender's avatar, when it could be loaded. */
  sender_avatar?: AvatarConfig;
}

export type FriendStatus = "logged" | "resting" | "private";

/** A quiet day and "not yet" look the same from outside: both are "resting". */
export function friendStatus(f: Pick<FriendSummary, "share_level" | "logged_today">): FriendStatus {
  if (f.share_level === "off" || f.logged_today === null) return "private";
  return f.logged_today ? "logged" : "resting";
}

export const STATUS_TEXT: Record<FriendStatus, string> = {
  logged: "Checked in today",
  resting: "Resting",
  private: "Keeping things private",
};

/** Friends by name, A to Z. The only order there is. */
export function byName<T extends { name: string }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/** "2 logs today" for friends who share counts, else null. */
export function countText(f: Pick<FriendSummary, "today_count">): string | null {
  if (f.today_count === null) return null;
  if (f.today_count === 0) return "No logs yet today";
  return f.today_count === 1 ? "1 log today" : `${f.today_count} logs today`;
}
