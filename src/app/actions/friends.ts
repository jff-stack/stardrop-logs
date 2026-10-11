"use server";

// Everything a user can do in the friends feature. Each action checks its
// input, then calls one database function (0005_friends.sql) as the signed-in
// user. The limits and the privacy rules live in those functions, not here,
// so calling the API directly gets the same answers.
//
// Wording rule: nothing here may reveal anything about another person. A bad
// link, your own link, someone who blocked you and someone you're already
// friends with all get the same "Couldn't use that link."
import { refresh } from "next/cache";
import { getUser } from "@/lib/auth";
import type { NudgeKind } from "@/lib/nudges";
import type { ShareLevel } from "@/lib/friends";
import {
  FriendCodeSchema, NudgeSchema, RespondSchema, SharingSchema, TimezoneSchema, UuidSchema,
} from "@/lib/validation";

export type FriendResult = { ok: true; message: string } | { ok: false; error: string };

const SIGNED_OUT: FriendResult = { ok: false, error: "Your session ran out. Please sign in again." };
const TRY_AGAIN: FriendResult = { ok: false, error: "That didn't work. Try again?" };
const BAD_LINK: FriendResult = { ok: false, error: "Couldn't use that link." };

/** Open someone's invite link. `code` is the last part of the link. */
export async function sendFriendRequest(code: string): Promise<FriendResult> {
  const parsed = FriendCodeSchema.safeParse(code);
  // Not even shaped like a code: same answer as a wrong one.
  if (!parsed.success) return BAD_LINK;

  const { supabase, user } = await getUser();
  if (!user) return SIGNED_OUT;

  const { data, error } = await supabase.rpc("send_friend_request", { p_code: parsed.data });
  if (error) return TRY_AGAIN;
  refresh();
  switch (data) {
    case "sent":
      return { ok: true, message: "Request sent! They'll show up once they say yes." };
    case "accepted":
      return { ok: true, message: "You're friends now!" };
    case "daily_limit":
      return { ok: false, error: "That's plenty of links for one day. Try again tomorrow." };
    case "friend_limit":
      return { ok: false, error: "Your friends list is full (50)." };
    case "pending_limit":
      return { ok: false, error: "You have 10 requests waiting. Give them time to answer first." };
    default:
      return BAD_LINK;
  }
}

export async function respondToRequest(id: string, accept: boolean): Promise<FriendResult> {
  const parsed = RespondSchema.safeParse({ id, accept });
  if (!parsed.success) return TRY_AGAIN;

  const { supabase, user } = await getUser();
  if (!user) return SIGNED_OUT;

  const { data, error } = await supabase.rpc("respond_to_request", { p_id: parsed.data.id, p_accept: parsed.data.accept });
  if (error) return TRY_AGAIN;
  refresh();
  if (data === "accepted") return { ok: true, message: "You're friends now!" };
  if (data === "declined") return { ok: true, message: "Request removed." };
  if (data === "friend_limit") return { ok: false, error: "Your friends list is full (50)." };
  return { ok: false, error: "That request isn't around any more." };
}

/** Unfriend, or take back a request. `id` is the other person's id. */
export async function removeFriend(id: string): Promise<FriendResult> {
  const parsed = UuidSchema.safeParse(id);
  if (!parsed.success) return TRY_AGAIN;

  const { supabase, user } = await getUser();
  if (!user) return SIGNED_OUT;

  const { error } = await supabase.rpc("remove_friend", { p_user: parsed.data });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true, message: "Removed." };
}

export async function blockUser(id: string): Promise<FriendResult> {
  const parsed = UuidSchema.safeParse(id);
  if (!parsed.success) return TRY_AGAIN;

  const { supabase, user } = await getUser();
  if (!user) return SIGNED_OUT;

  const { error } = await supabase.rpc("block_user", { p_user: parsed.data });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true, message: "Blocked. They won't be told." };
}

export async function unblockUser(id: string): Promise<FriendResult> {
  const parsed = UuidSchema.safeParse(id);
  if (!parsed.success) return TRY_AGAIN;

  const { supabase, user } = await getUser();
  if (!user) return SIGNED_OUT;

  const { error } = await supabase.rpc("unblock_user", { p_user: parsed.data });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true, message: "Unblocked." };
}

/** Mute (or unmute) a friend's nudges. They aren't told either way. */
export async function muteFriend(id: string, muted = true): Promise<FriendResult> {
  const parsed = UuidSchema.safeParse(id);
  if (!parsed.success || typeof muted !== "boolean") return TRY_AGAIN;

  const { supabase, user } = await getUser();
  if (!user) return SIGNED_OUT;

  const { error } = await supabase.rpc("mute_friend", { p_user: parsed.data, p_muted: muted });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true, message: muted ? "Muted. They won't be told." : "Unmuted." };
}

export async function sendNudge(friendId: string, kind: NudgeKind): Promise<FriendResult> {
  const parsed = NudgeSchema.safeParse({ friendId, kind });
  if (!parsed.success) return TRY_AGAIN;

  const { supabase, user } = await getUser();
  if (!user) return SIGNED_OUT;

  const { data, error } = await supabase.rpc("send_nudge", { p_user: parsed.data.friendId, p_kind: parsed.data.kind });
  if (error) return TRY_AGAIN;
  // "sent" is also what comes back when the friend has nudges off or has
  // muted you. That's on purpose; don't add a way to tell the difference.
  if (data === "sent") return { ok: true, message: "Sent!" };
  if (data === "too_soon") return { ok: false, error: "You've already nudged them today. One a day keeps it friendly." };
  if (data === "daily_limit") return { ok: false, error: "That's all your nudges for today." };
  return TRY_AGAIN;
}

export async function dismissNudge(id: string): Promise<FriendResult> {
  const parsed = UuidSchema.safeParse(id);
  if (!parsed.success) return TRY_AGAIN;

  const { supabase, user } = await getUser();
  if (!user) return SIGNED_OUT;

  const { error } = await supabase.rpc("dismiss_nudge", { p_id: parsed.data });
  if (error) return TRY_AGAIN;
  refresh();
  return { ok: true, message: "Dismissed." };
}

/** Save what friends may see. Also marks the explainer as read. */
export async function updateSharing(input: { share_level: ShareLevel; accept_nudges: boolean }): Promise<FriendResult> {
  const parsed = SharingSchema.safeParse(input);
  if (!parsed.success) return TRY_AGAIN;

  const { supabase, user } = await getUser();
  if (!user) return SIGNED_OUT;

  // .select().single() so a write that changed no row is an error, not "Saved".
  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, sharing_seen: true })
    .eq("id", user.id)
    .select("id")
    .single();
  if (error) return { ok: false, error: "Couldn't save that. Try again?" };
  refresh();
  return { ok: true, message: "Saved." };
}

/** Swap the invite link for a new one. The old link stops working. */
export async function regenerateFriendCode(): Promise<FriendResult & { code?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return SIGNED_OUT;

  const { data, error } = await supabase.rpc("regenerate_friend_code");
  if (error || typeof data !== "string") return TRY_AGAIN;
  refresh();
  return { ok: true, message: "New link made. The old one won't work any more.", code: data };
}

/**
 * Remember the browser's timezone, so "logged today" means this person's
 * today when a friend looks. The garden calls it only when the zone changed.
 * No refresh: nothing on the caller's own screen depends on it.
 */
export async function setTimezone(timezone: string): Promise<{ ok: boolean }> {
  const parsed = TimezoneSchema.safeParse(timezone);
  if (!parsed.success) return { ok: false };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.from("profiles").update({ timezone: parsed.data }).eq("id", user.id);
  return { ok: !error };
}
