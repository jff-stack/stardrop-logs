"use client";

// Check-in streak: the count, this week at a glance, and the next badge.
// A log or a quiet day both count, and today can't break it before it's over.
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import PixelArt, { ICONS, type PixelGrid } from "@/components/ui/PixelArt";
import type { DayStatus, Garden } from "@/lib/farm";
import { milestoneProgress } from "@/lib/streak";

gsap.registerPlugin(useGSAP);

const CHECK: PixelGrid = [".....o", "....oo", "o..oo.", "oooo..", ".oo...", "......"];
const MOON: PixelGrid = ["..oo.", ".o...", "o....", "o....", ".o...", "..oo."];
const ASK: PixelGrid = [".oo.", "o..o", "..o.", ".o..", "....", ".o.."];

const DOT_STYLE: Record<DayStatus, { bg: string; icon: PixelGrid | null; label: string }> = {
  movement: { bg: "var(--color-mint)", icon: CHECK, label: "logged" },
  quiet: { bg: "var(--color-lilac)", icon: MOON, label: "quiet day" },
  pending: { bg: "var(--color-butter)", icon: ASK, label: "not yet" },
  missed: { bg: "var(--color-cream-2)", icon: null, label: "missed" },
};

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";

export default function StreakCard({ garden }: Readonly<{ garden: Garden | null }>) {
  const scope = useRef<HTMLElement>(null);
  const current = garden?.streak.current ?? 0;
  const ms = milestoneProgress(current);
  const pct = ms.total > 0 ? Math.round((ms.done / ms.total) * 100) : 100;

  // Count-up + bar fill whenever the streak changes.
  useGSAP(
    () => {
      if (!garden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const n = { v: 0 };
      const el = scope.current?.querySelector<HTMLElement>(".streak-num");
      gsap.to(n, {
        v: current,
        duration: 0.8,
        ease: `steps(${Math.max(1, current)})`,
        onUpdate: () => {
          if (el) el.textContent = String(Math.round(n.v));
        },
      });
      gsap.from(".streak-fill", { width: 0, duration: 0.9, ease: "power2.out", delay: 0.2 });
      gsap.from(".week-dot", { scale: 0, duration: 0.4, ease: "back.out(3)", stagger: 0.05 });
    },
    { dependencies: [current, garden !== null], scope },
  );

  return (
    <section ref={scope} className="pix-card pix-card--pink" aria-labelledby="streak-title">
      <h2 id="streak-title" className="sr-only">Streak</h2>

      <div className="flex items-center gap-3">
        <span className={current > 0 ? "animate-wiggle" : ""}>
          <PixelArt grid={ICONS.stardrop} scale={6} />
        </span>
        <div>
          <p className="text-[42px] font-bold leading-none">
            <span className="streak-num">{current}</span>
          </p>
          <p className="text-[17px]">day streak</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[15px] text-plum-soft">Best</p>
          <p className="text-[24px] font-bold leading-none">{garden?.streak.best ?? 0}</p>
        </div>
      </div>

      {/* This week */}
      <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="This week">
        {(garden?.week ?? []).map((d) => {
          const style = DOT_STYLE[d.status];
          const name = d.date.toLocaleDateString(undefined, { weekday: "short" });
          return (
            <li key={d.day} className="flex flex-col items-center gap-1">
              <span className="text-[13px] leading-none text-plum-soft">
                {d.date.toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
              <span
                className="week-dot flex aspect-square w-full max-w-[34px] items-center justify-center"
                style={{ background: style.bg, boxShadow: OUTLINE }}
                aria-label={`${name}: ${style.label}`}
                role="img"
              >
                {style.icon && <PixelArt grid={style.icon} scale={3} />}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Next milestone */}
      <div className="mt-4">
        <p className="mb-1.5 text-[16px]">
          {ms.next ? (
            <>
              {ms.remaining} more {ms.remaining === 1 ? "day" : "days"} to earn{" "}
              <strong>{ms.next.name}</strong>
            </>
          ) : (
            <>Every badge earned. You&apos;re a legend!</>
          )}
        </p>
        <div
          className="h-3.5 w-full bg-cream-2"
          style={{ boxShadow: OUTLINE }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Progress to next badge"
        >
          <div className="streak-fill h-full bg-butter-deep" style={{ width: `${pct}%` }} />
        </div>
        {ms.earned && (
          <p className="mt-1.5 text-[14px] text-plum-soft">Latest badge: {ms.earned.name} ✦</p>
        )}
      </div>
    </section>
  );
}
