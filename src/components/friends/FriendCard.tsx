"use client";

// One friend. Shows only what they chose to share, and nothing to compare:
// no streak numbers, no "last seen", no ordering. Someone who hasn't checked
// in today is simply "resting" (a quiet day looks exactly the same).
import { useState } from "react";
import NudgePicker from "./NudgePicker";
import Avatar from "@/components/avatar/Avatar";
import type { AvatarConfig } from "@/lib/avatar/compose";
import PixelArt, { ICONS } from "@/components/ui/PixelArt";
import { BADGE_ART, LOCKED_PALETTE } from "@/lib/badge-art";
import { BADGES } from "@/lib/badges";
import { CROP_ART } from "@/lib/crops";
import { daysAgo } from "@/lib/dates";
import { STATUS_TEXT, countText, friendStatus, type FriendSummary } from "@/lib/friends";
import type { NudgeKind } from "@/lib/nudges";

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";

interface FriendCardProps {
  friend: FriendSummary;
  avatar: AvatarConfig;
  muted: boolean;
  busy: boolean;
  now: Date | null;
  onNudge: (kind: NudgeKind) => void;
  onMute: (muted: boolean) => void;
  onRemove: () => void;
  onBlock: () => void;
}

type Panel = "none" | "nudge" | "menu" | "confirm-remove" | "confirm-block";

export default function FriendCard({ friend, avatar, muted, busy, now, onNudge, onMute, onRemove, onBlock }: Readonly<FriendCardProps>) {
  const [panel, setPanel] = useState<Panel>("none");
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? "none" : p));

  const status = friendStatus(friend);
  const badge = friend.best_badge ? BADGES.find((b) => b.id === friend.best_badge) : undefined;
  const counts = countText(friend);

  return (
    <li className="pix-card !py-3">
      <div className="flex items-center gap-3">
        <span className="relative shrink-0">
          <Avatar config={avatar} size={48} />
          {/* Today's status, tucked on the corner of the avatar. */}
          <span
            className="absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center"
            // The sparkle is white and yellow, so it needs a darker tile behind it.
            style={{ background: status === "logged" ? "var(--color-lilac-deep)" : "var(--color-cream-2)", boxShadow: OUTLINE }}
          >
            {status === "logged" && <PixelArt grid={ICONS.sparkle} scale={3} />}
            {status === "resting" && <PixelArt grid={CROP_ART.seed} scale={1.5} palette={LOCKED_PALETTE} />}
            {status === "private" && <PixelArt grid={ICONS.heart} scale={2} palette={LOCKED_PALETTE} />}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[19px] font-bold leading-tight">{friend.name}</h3>
          <p className="text-[15px] text-plum-soft">
            {STATUS_TEXT[status]}
            {counts && status === "logged" ? ` · ${counts}` : ""}
          </p>
        </div>
        {badge && (
          <span className="flex shrink-0 flex-col items-center gap-0.5">
            <PixelArt grid={BADGE_ART[badge.artKey]} scale={2} title={`Best streak badge: ${badge.name}`} />
            <span className="max-w-[72px] text-center text-[11px] leading-none text-plum-soft">{badge.name}</span>
          </span>
        )}
      </div>

      {friend.week_counts && (
        <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label={`${friend.name}'s last 7 days`}>
          {friend.week_counts.map((n, i) => {
            const date = now ? daysAgo(6 - i, now) : null;
            const day = date?.toLocaleDateString(undefined, { weekday: "short" }) ?? `Day ${i + 1}`;
            return (
              <li key={i} className="flex flex-col items-center gap-1">
                <span
                  role="img"
                  aria-label={`${day}: ${n === 1 ? "1 log" : `${n} logs`}`}
                  className="flex aspect-square w-full max-w-[26px] items-center justify-center text-[12px] font-bold leading-none"
                  style={{ background: n > 0 ? "var(--color-mint)" : "var(--color-cream-2)", boxShadow: OUTLINE }}
                >
                  {n > 0 ? n : ""}
                </span>
                <span aria-hidden className="text-[11px] leading-none text-plum-soft">
                  {date?.toLocaleDateString(undefined, { weekday: "narrow" }) ?? ""}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => toggle("nudge")}
          aria-expanded={panel === "nudge"}
          className="pix-btn pix-btn--lilac pix-btn--sm"
        >
          Nudge
        </button>
        <button
          type="button"
          onClick={() => toggle("menu")}
          aria-expanded={panel === "menu" || panel.startsWith("confirm")}
          aria-label={`More options for ${friend.name}`}
          className="pix-btn pix-btn--cream pix-btn--sm"
        >
          More
        </button>
      </div>

      {panel === "nudge" && (
        <NudgePicker
          friendName={friend.name}
          disabled={busy}
          onPick={(kind) => {
            setPanel("none");
            onNudge(kind);
          }}
        />
      )}

      {panel === "menu" && (
        <div className="mt-2.5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setPanel("none");
              onMute(!muted);
            }}
            className="pix-btn pix-btn--cream pix-btn--sm"
          >
            {muted ? "Unmute their nudges" : "Mute their nudges"}
          </button>
          <button type="button" onClick={() => setPanel("confirm-remove")} className="pix-btn pix-btn--cream pix-btn--sm">
            Remove friend
          </button>
          <button type="button" onClick={() => setPanel("confirm-block")} className="pix-btn pix-btn--cream pix-btn--sm">
            Block
          </button>
        </div>
      )}

      {(panel === "confirm-remove" || panel === "confirm-block") && (
        <div className="mt-2.5 flex flex-col gap-2 bg-cream-2 px-3 py-2.5">
          <p className="text-[16px]">
            {panel === "confirm-remove"
              ? `Remove ${friend.name}? You'll stop seeing each other. They aren't told.`
              : `Block ${friend.name}? You'll stop seeing each other, and their links and nudges won't reach you. They aren't told.`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const action = panel === "confirm-remove" ? onRemove : onBlock;
                setPanel("none");
                action();
              }}
              className="pix-btn pix-btn--sm"
            >
              {panel === "confirm-remove" ? "Remove" : "Block"}
            </button>
            <button type="button" onClick={() => setPanel("none")} className="pix-btn pix-btn--cream pix-btn--sm">
              Never mind
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
