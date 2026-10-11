"use client";

// The badges page body: Mia, the two streak numbers, then every badge in its
// group. Tapping a badge opens a small panel under its group with what it's
// for and either the date it was earned or how far along it is.
//
// Locked badges are a dim silhouette with a padlock and the word "Locked", so
// the state is clear without relying on colour. Nothing here says "failed".
import { useState } from "react";
import MiaCorner from "@/components/dashboard/MiaCorner";
import PixelArt from "@/components/ui/PixelArt";
import { useNow } from "@/hooks/useNow";
import { BADGE_ART, LOCKED_PALETTE, LOCK_ART } from "@/lib/badge-art";
import {
  BADGES, BADGE_GROUPS, badgeLabel, computeStats, formatDay, progressText, type Badge, type BadgeStats,
} from "@/lib/badges";
import type { BadgeHistory } from "@/lib/data/badges";
import { badgesLines } from "@/lib/dialogue";

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";

export default function BadgesView({ history }: Readonly<{ history: BadgeHistory }>) {
  // null until the browser has hydrated, so days are counted in its timezone.
  const now = useNow();
  const [openId, setOpenId] = useState<string | null>(null);
  const [lineIdx, setLineIdx] = useState(0);

  if (!now) return <p className="pix-card text-center text-[17px]">Polishing your badges…</p>;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const stats = computeStats(history.logTimes, history.quietDays, now, tz);
  const earned = BADGES.filter((b) => b.earned(stats)).length;
  const lines = badgesLines(stats, earned, BADGES.length);

  return (
    <>
      <MiaCorner
        text={lines[lineIdx % lines.length]}
        state={earned > 0 ? "celebrate" : "help"}
        onNext={() => setLineIdx((i) => i + 1)}
      />

      {!history.complete && (
        <p role="alert" className="pix-card !py-2 text-[16px]">
          Some of your history didn&apos;t load, so a few badges may be missing. Try reloading.
        </p>
      )}

      <section className="pix-card pix-card--pink" aria-label="Your streaks">
        <dl className="grid grid-cols-2 gap-3 text-center">
          <div>
            <dt className="text-[15px] text-plum-soft">Current streak</dt>
            <dd className="text-[24px] font-bold leading-tight">{days(stats.currentStreak)}</dd>
          </div>
          <div>
            <dt className="text-[15px] text-plum-soft">Longest streak</dt>
            <dd className="text-[24px] font-bold leading-tight">{days(stats.longestStreak)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-center text-[15px] text-plum-soft">
          {earned} of {BADGES.length} badges. A log or a quiet day both count.
        </p>
      </section>

      {BADGE_GROUPS.map((group) => {
        const badges = BADGES.filter((b) => b.group === group);
        const open = badges.find((b) => b.id === openId);
        return (
          <section key={group} className="pix-card" aria-labelledby={`group-${slug(group)}`}>
            <h2 id={`group-${slug(group)}`} className="text-[20px] font-bold">{group}</h2>
            <ul className="mt-3 grid grid-cols-3 gap-2.5 px-[2px]">
              {badges.map((b) => (
                <li key={b.id}>
                  <BadgeTile
                    badge={b}
                    stats={stats}
                    open={b.id === openId}
                    onToggle={() => setOpenId(b.id === openId ? null : b.id)}
                  />
                </li>
              ))}
            </ul>
            {open && <BadgeDetail badge={open} stats={stats} />}
          </section>
        );
      })}
    </>
  );
}

const days = (n: number) => (n === 1 ? "1 day" : `${n} days`);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "-");

function BadgeTile({
  badge,
  stats,
  open,
  onToggle,
}: Readonly<{ badge: Badge; stats: BadgeStats; open: boolean; onToggle: () => void }>) {
  const isEarned = badge.earned(stats);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={`detail-${badge.id}`}
      aria-label={badgeLabel(badge, stats)}
      className="flex h-full w-full flex-col items-center gap-1.5 px-1 py-2.5 text-center"
      style={{ background: open ? "var(--color-butter)" : "var(--color-cream-2)", boxShadow: OUTLINE }}
    >
      <span className="relative">
        <PixelArt grid={BADGE_ART[badge.artKey]} scale={3} palette={isEarned ? undefined : LOCKED_PALETTE} />
        {!isEarned && (
          <span className="absolute -bottom-1 -right-1">
            <PixelArt grid={LOCK_ART} scale={2} />
          </span>
        )}
      </span>
      <span className="text-[14px] font-semibold leading-tight">{badge.name}</span>
      <span className="text-[12px] leading-none text-plum-soft">{isEarned ? "Earned" : "Locked"}</span>
    </button>
  );
}

function BadgeDetail({ badge, stats }: Readonly<{ badge: Badge; stats: BadgeStats }>) {
  const isEarned = badge.earned(stats);
  const earnedOn = badge.earnedOn(stats);
  const { current, target } = badge.progress(stats);
  const pct = Math.round((current / target) * 100);

  return (
    <div id={`detail-${badge.id}`} role="region" aria-label={badge.name} className="mt-3 bg-cream-2 px-3 py-3">
      <h3 className="text-[18px] font-bold">{badge.name}</h3>
      <p className="text-[16px]">{badge.description}</p>
      {isEarned ? (
        <p className="mt-2 text-[16px] font-semibold">
          {earnedOn ? `Earned on ${formatDay(earnedOn)}` : "Earned"}
        </p>
      ) : (
        <div className="mt-2 flex items-center gap-2.5">
          <div
            className="h-2.5 flex-1 bg-cream"
            style={{ boxShadow: OUTLINE }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={current}
            aria-label={`Progress: ${progressText(badge, stats)}`}
          >
            <div className="h-full bg-butter-deep" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-[15px]">{progressText(badge, stats)}</span>
        </div>
      )}
    </div>
  );
}
