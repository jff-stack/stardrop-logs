"use client";

// Check-in streak in one small card: the count, this week as dots, and how
// close the next badge is. A log or a quiet day both count, and today can't
// break it before it's over.
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import PixelArt, { ICONS, type PixelGrid } from "@/components/ui/PixelArt";
import type { DayStatus, Garden } from "@/lib/farm";
import { milestoneProgress } from "@/lib/streak";

gsap.registerPlugin(useGSAP);

const CHECK: PixelGrid = [".....o", "....oo", "o..oo.", "oooo..", ".oo...", "......"];
const MOON: PixelGrid = ["..oo.", ".o...", "o....", "o....", ".o...", "..oo."];

const DOT_STYLE: Record<DayStatus, { bg: string; icon: PixelGrid | null; label: string }> = {
  movement: { bg: "var(--color-mint)", icon: CHECK, label: "logged" },
  quiet: { bg: "var(--color-lilac)", icon: MOON, label: "quiet day" },
  pending: { bg: "var(--color-butter)", icon: null, label: "not yet" },
  missed: { bg: "var(--color-cream-2)", icon: null, label: "missed" },
};

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";

export default function StreakCard({ garden }: Readonly<{ garden: Garden | null }>) {
  const scope = useRef<HTMLElement>(null);
  const current = garden?.streak.current ?? 0;
  const ms = milestoneProgress(current);
  const pct = ms.total > 0 ? Math.round((ms.done / ms.total) * 100) : 100;

  useGSAP(
    () => {
      if (!garden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".streak-fill", { width: 0, duration: 0.9, ease: "power2.out", delay: 0.2 });
      gsap.from(".week-dot", { scale: 0, duration: 0.4, ease: "back.out(3)", stagger: 0.05 });
    },
    { dependencies: [current, garden !== null], scope },
  );

  return (
    <section ref={scope} data-tour="streak" className="pix-card pix-card--pink" aria-labelledby="streak-title">
      <div className="flex items-center gap-2.5">
        <span className={current > 0 ? "animate-wiggle" : ""}>
          <PixelArt grid={ICONS.stardrop} scale={4} />
        </span>
        <h2 id="streak-title" className="text-[20px] font-bold leading-none">
          {current} day streak
        </h2>
        <span className="ml-auto text-[15px] text-plum-soft">best {garden?.streak.best ?? 0}</span>
      </div>

      <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label="This week">
        {(garden?.week ?? []).map((d) => {
          const style = DOT_STYLE[d.status];
          const name = d.date.toLocaleDateString(undefined, { weekday: "short" });
          return (
            <li key={d.day} className="flex flex-col items-center gap-1">
              <span
                className="week-dot flex aspect-square w-full max-w-[30px] items-center justify-center"
                style={{ background: style.bg, boxShadow: OUTLINE }}
                aria-label={`${name}: ${style.label}`}
                role="img"
              >
                {style.icon && <PixelArt grid={style.icon} scale={2} />}
              </span>
              <span className="text-[12px] leading-none text-plum-soft">
                {d.date.toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex items-center gap-2.5">
        <div
          className="h-2.5 flex-1 bg-cream-2"
          style={{ boxShadow: OUTLINE }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Progress to next badge"
        >
          <div className="streak-fill h-full bg-butter-deep" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-[14px]">
          {ms.next ? `${ms.remaining} to ${ms.next.name}` : "All badges!"}
        </span>
      </div>
    </section>
  );
}
