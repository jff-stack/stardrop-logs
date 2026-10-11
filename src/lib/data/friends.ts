// Loads the friends screen, and the nudges waiting for the garden.
// Everything about other people comes from database functions that return
// only what those people chose to share (see 0005_friends.sql); this file
// never reads anyone else's rows directly, and couldn't if it tried.
import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { resolveAvatar, type AvatarConfig } from "@/lib/avatar/compose";
import {
  isShareLevel, type FriendRequest, type FriendSummary, type IncomingNudge, type ShareLevel,
} from "@/lib/friends";

type Client = Awaited<ReturnType<typeof createClient>>;

export interface FriendsData {
  /** False until 0005_friends.sql has been run. */
  available: boolean;
  me: {
    friendCode: string;
    shareLevel: ShareLevel;
    acceptNudges: boolean;
    /** Has the "what friends can see" explainer been answered yet? */
    sharingSeen: boolean;
  };
  friends: FriendSummary[];
  requests: FriendRequest[];
  /** Ids of friends whose nudges I've muted. */
  muted: string[];
  blocked: { user_id: string; name: string }[];
  /** Avatars of friends and of people in a pending request, by user id. */
  avatars: Record<string, AvatarConfig>;
}

const UNAVAILABLE: FriendsData = {
  available: false,
  me: { friendCode: "", shareLevel: "off", acceptNudges: true, sharingSeen: false },
  friends: [],
  requests: [],
  muted: [],
  blocked: [],
  avatars: {},
};

/**
 * Avatars of the people I'm connected to, ready to draw, by user id.
 * Empty before 0006_avatar.sql; callers fall back to each person's default.
 */
export async function getFriendAvatars(supabase: Client): Promise<Record<string, AvatarConfig>> {
  const { data, error } = await supabase.rpc("get_friend_avatars");
  if (error) return {};
  const rows = (data ?? []) as { user_id: string; avatar: unknown }[];
  return Object.fromEntries(rows.map((r) => [r.user_id, resolveAvatar(r.avatar, r.user_id)]));
}

/** My own sharing settings and invite code. null before the migration. */
export async function getSharing(supabase: Client, userId: string): Promise<FriendsData["me"] | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("friend_code, share_level, accept_nudges, sharing_seen")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return {
    friendCode: data.friend_code,
    shareLevel: isShareLevel(data.share_level) ? data.share_level : "off",
    acceptNudges: data.accept_nudges !== false,
    sharingSeen: data.sharing_seen === true,
  };
}

export async function getFriendsData(supabase: Client, userId: string): Promise<FriendsData> {
  const [me, friends, requests, blocked, mutes, avatars] = await Promise.all([
    getSharing(supabase, userId),
    supabase.rpc("get_friends_summary"),
    supabase.rpc("get_friend_requests"),
    supabase.rpc("get_blocked_users"),
    supabase.from("friend_mutes").select("muted_user_id"),
    getFriendAvatars(supabase),
  ]);

  if (!me || friends.error || requests.error) {
    if (friends.error) console.warn("friends unavailable:", friends.error.message);
    return UNAVAILABLE;
  }

  return {
    available: true,
    me,
    friends: (friends.data ?? []) as FriendSummary[],
    requests: (requests.data ?? []) as FriendRequest[],
    muted: (mutes.data ?? []).map((m: { muted_user_id: string }) => m.muted_user_id),
    blocked: (blocked.data ?? []) as FriendsData["blocked"],
    avatars,
  };
}

/** Nudges waiting for me. Empty (not an error) before the migration. */
export async function getMyNudges(supabase: Client): Promise<IncomingNudge[]> {
  const { data, error } = await supabase.rpc("get_my_nudges");
  if (error) return [];
  const nudges = (data ?? []) as IncomingNudge[];
  if (nudges.length === 0) return nudges;

  // Who sent each one (the function only gives a name), so Mia can show
  // their avatar. Only rows addressed to me and delivered are readable.
  const [senders, avatars] = await Promise.all([
    supabase.from("nudges").select("id, sender_id").in("id", nudges.map((n) => n.id)),
    getFriendAvatars(supabase),
  ]);
  const senderOf = new Map(((senders.data ?? []) as { id: string; sender_id: string }[]).map((r) => [r.id, r.sender_id]));
  return nudges.map((n) => {
    const sender = senderOf.get(n.id);
    return sender ? { ...n, sender_avatar: avatars[sender] ?? resolveAvatar(null, sender) } : n;
  });
}
