"use client";

// Friend requests waiting: ones to answer, and ones you've sent.
import Avatar from "@/components/avatar/Avatar";
import { resolveAvatar, type AvatarConfig } from "@/lib/avatar/compose";
import { byName, type FriendRequest } from "@/lib/friends";

interface RequestsListProps {
  requests: FriendRequest[];
  avatars: Record<string, AvatarConfig>;
  busy: boolean;
  onRespond: (request: FriendRequest, accept: boolean) => void;
  /** Take back a request you sent. */
  onCancel: (request: FriendRequest) => void;
}

export default function RequestsList({ requests, avatars, busy, onRespond, onCancel }: Readonly<RequestsListProps>) {
  if (requests.length === 0) return null;
  const incoming = byName(requests.filter((r) => r.direction === "incoming"));
  const outgoing = byName(requests.filter((r) => r.direction === "outgoing"));

  return (
    <section className="pix-card pix-card--pink flex flex-col gap-3" aria-labelledby="requests-title">
      <h2 id="requests-title" className="text-[20px] font-bold">Requests</h2>
      <ul className="flex flex-col gap-3">
        {incoming.map((r) => (
          <li key={r.id} className="flex flex-col gap-2">
            <p className="flex items-center gap-3 text-[17px]">
              <Avatar config={avatars[r.user_id] ?? resolveAvatar(null, r.user_id)} size={40} />
              <span>
                <strong>{r.name}</strong> would like to be friends.
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => onRespond(r, true)} className="pix-btn pix-btn--mint pix-btn--sm">
                Accept
              </button>
              <button type="button" disabled={busy} onClick={() => onRespond(r, false)} className="pix-btn pix-btn--cream pix-btn--sm">
                No thanks
              </button>
            </div>
          </li>
        ))}
        {outgoing.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-3 text-[17px]">
              <Avatar config={avatars[r.user_id] ?? resolveAvatar(null, r.user_id)} size={32} />
              <span>
                Waiting for <strong>{r.name}</strong>
              </span>
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => onCancel(r)}
              aria-label={`Cancel your request to ${r.name}`}
              className="shrink-0 text-[15px] underline underline-offset-4"
            >
              Cancel
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
