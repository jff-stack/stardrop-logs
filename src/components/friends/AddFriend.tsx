"use client";

// Your invite link. Adding a friend only ever happens by one person sending
// their link to the other: there's no code box and no search, so nobody can
// go looking for people.
import { useState, useSyncExternalStore } from "react";
import { friendLink } from "@/lib/friend-link";

interface AddFriendProps {
  code: string;
  busy: boolean;
  /** Ask for a new link (the old one stops working). */
  onRegenerate: () => void;
  /** Lets Mia say "Copied!". */
  onNotice: (text: string) => void;
}

const noop = () => () => {};

export default function AddFriend({ code, busy, onRegenerate, onNotice }: Readonly<AddFriendProps>) {
  // The site address is only known in the browser.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);
  const [confirming, setConfirming] = useState(false);
  const link = origin ? friendLink(origin, code) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      onNotice("Copied! Send it to a friend.");
    } catch {
      onNotice("Couldn't copy that. Press and hold the link to copy it instead.");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: "Stardrop Logs", text: "Be my garden friend on Stardrop Logs:", url: link });
    } catch {
      // Closed the share sheet: nothing to do.
    }
  };

  return (
    <section className="pix-card pix-card--lilac flex flex-col gap-3" aria-labelledby="add-friend-title">
      <h2 id="add-friend-title" className="text-[20px] font-bold">Add a friend</h2>
      <p className="text-[16px]">
        Send this link to someone you know. When they open it they can ask to be your friend, and you say yes or no.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold">Your invite link</span>
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="pix-well min-h-[46px] px-3 text-[15px] outline-offset-2"
        />
      </label>
      <div className={`grid gap-2 ${canShare ? "grid-cols-2" : "grid-cols-1"}`}>
        <button type="button" onClick={copy} disabled={!link} className="pix-btn pix-btn--mint pix-btn--sm">
          Copy link
        </button>
        {canShare && (
          <button type="button" onClick={share} disabled={!link} className="pix-btn pix-btn--butter pix-btn--sm">
            Share
          </button>
        )}
      </div>

      {confirming ? (
        <div className="flex flex-col gap-2 bg-cream px-3 py-2.5">
          <p className="text-[16px]">Make a new link? The one you&apos;ve already sent out will stop working.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                onRegenerate();
              }}
              className="pix-btn pix-btn--sm"
            >
              New link
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="pix-btn pix-btn--cream pix-btn--sm">
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="self-start text-[15px] underline underline-offset-4">
          Make a new link
        </button>
      )}
    </section>
  );
}
