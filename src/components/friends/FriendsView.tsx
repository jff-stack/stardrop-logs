"use client";

// The Friends screen: Mia, requests, friends (by name), your invite link,
// sharing choices and the block list. Mia's bubble doubles as the place
// where "Sent!" and friends appear, so there are no toasts, badges or dots.
//
// No live connection: the list refreshes after each action and whenever the
// tab comes back into view.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AddFriend from "./AddFriend";
import FriendCard from "./FriendCard";
import RequestsList from "./RequestsList";
import SharingExplainer from "./SharingExplainer";
import SharingSettings from "./SharingSettings";
import MiaCorner from "@/components/dashboard/MiaCorner";
import { useNow } from "@/hooks/useNow";
import {
  blockUser, muteFriend, regenerateFriendCode, removeFriend, respondToRequest, sendNudge, unblockUser,
  type FriendResult,
} from "@/app/actions/friends";
import type { FriendsData } from "@/lib/data/friends";
import { friendsLines } from "@/lib/dialogue";
import { byName } from "@/lib/friends";
import { resolveAvatar } from "@/lib/avatar/compose";

type Action = () => Promise<FriendResult>;

export default function FriendsView({ data }: Readonly<{ data: FriendsData }>) {
  const router = useRouter();
  const now = useNow();
  const [busy, startTransition] = useTransition();
  const [lineIdx, setLineIdx] = useState(0);
  // What Mia says about the last thing you did.
  const [aside, setAside] = useState<string | null>(null);
  // An accept that is waiting for the sharing explainer to be answered.
  const [waiting, setWaiting] = useState<{ action: Action } | null>(null);

  // Pick up anything friends did while this tab was in the background.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  if (!data.available) {
    return (
      <p className="pix-card text-[17px]">
        Friends isn&apos;t switched on for this garden yet. (If this is your own copy: run
        supabase/migrations/0005_friends.sql.)
      </p>
    );
  }

  const run = (action: Action) =>
    startTransition(async () => {
      const res = await action();
      setAside(res.ok ? res.message : res.error);
    });

  const friends = byName(data.friends);
  const incoming = data.requests.filter((r) => r.direction === "incoming").length;
  const lines = friendsLines(friends.length, incoming);

  return (
    <>
      <MiaCorner
        text={aside ?? lines[lineIdx % lines.length]}
        state={aside ? "inspect" : "idle"}
        onNext={() => {
          setAside(null);
          setLineIdx((i) => i + 1);
        }}
      />

      {waiting && (
        <SharingExplainer
          acceptNudges={data.me.acceptNudges}
          onCancel={() => setWaiting(null)}
          onDone={() => {
            const { action } = waiting;
            setWaiting(null);
            run(action);
          }}
        />
      )}

      <RequestsList
        requests={data.requests}
        avatars={data.avatars}
        busy={busy}
        onCancel={(r) => run(() => removeFriend(r.user_id))}
        onRespond={(r, accept) => {
          const action = () => respondToRequest(r.id, accept);
          // Saying yes for the first time: choose what to share first.
          if (accept && !data.me.sharingSeen) setWaiting({ action });
          else run(action);
        }}
      />

      <section aria-labelledby="friends-title" className="flex flex-col gap-3">
        <h2 id="friends-title" className="pix-title text-[22px] leading-none">Your friends</h2>
        {friends.length === 0 ? (
          <p className="pix-card text-[17px]">Nobody here yet. Send someone your link below to get started.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {friends.map((f) => (
              <FriendCard
                key={f.friend_id}
                friend={f}
                // No saved avatar (or it couldn't be loaded): their default one.
                avatar={data.avatars[f.friend_id] ?? resolveAvatar(null, f.friend_id)}
                muted={data.muted.includes(f.friend_id)}
                busy={busy}
                now={now}
                onNudge={(kind) => run(() => sendNudge(f.friend_id, kind))}
                onMute={(muted) => run(() => muteFriend(f.friend_id, muted))}
                onRemove={() => run(() => removeFriend(f.friend_id))}
                onBlock={() => run(() => blockUser(f.friend_id))}
              />
            ))}
          </ul>
        )}
      </section>

      <AddFriend
        code={data.me.friendCode}
        busy={busy}
        onNotice={setAside}
        onRegenerate={() => run(regenerateFriendCode)}
      />

      <section className="pix-card flex flex-col gap-3" aria-labelledby="sharing-title">
        <h2 id="sharing-title" className="text-[20px] font-bold">What friends see</h2>
        <SharingSettings
          // Start again from the saved values whenever they change.
          key={`${data.me.shareLevel}-${data.me.acceptNudges}`}
          shareLevel={data.me.shareLevel}
          acceptNudges={data.me.acceptNudges}
        />
      </section>

      {data.blocked.length > 0 && (
        <section className="pix-card flex flex-col gap-2" aria-labelledby="blocked-title">
          <h2 id="blocked-title" className="text-[20px] font-bold">Blocked</h2>
          <ul className="flex flex-col gap-2">
            {byName(data.blocked).map((b) => (
              <li key={b.user_id} className="flex items-center justify-between gap-3 text-[17px]">
                <span className="truncate">{b.name}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => unblockUser(b.user_id))}
                  aria-label={`Unblock ${b.name}`}
                  className="shrink-0 text-[15px] underline underline-offset-4"
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
