"use client";

// Recent logs as little cards that drop into place with a soft bounce.
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import PixelArt from "@/components/ui/PixelArt";
import { BRISTOL, CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/bristol";
import { COLORS } from "@/lib/colors";
import { FACTORS } from "@/lib/factors";
import { clockTime, relativeTime } from "@/lib/dates";
import type { PoopLog } from "@/lib/types";

gsap.registerPlugin(useGSAP);

const VISIBLE = 5;
const TONE_FACE = { good: "var(--color-mint)", watch: "var(--color-peach)" } as const;

interface LogTimelineProps {
  logs: PoopLog[];
  /** null until mounted; times only render in the browser (user's timezone). */
  now: Date | null;
  /** Omit to hide the remove button (sample garden). */
  onDelete?: (id: string) => void;
}

export default function LogTimeline({ logs, now, onDelete }: Readonly<LogTimelineProps>) {
  const scope = useRef<HTMLElement>(null);
  // Which card is showing "Remove this log?" right now.
  const [confirming, setConfirming] = useState<string | null>(null);
  const shown = logs.slice(0, VISIBLE);
  const ids = shown.map((l) => l.id).join(",");

  useGSAP(
    () => {
      if (!ids || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".log-card", {
        y: -28,
        opacity: 0,
        rotation: () => gsap.utils.random(-3, 3),
        duration: 0.7,
        ease: "bounce.out",
        stagger: 0.08,
      });
    },
    { dependencies: [ids], scope },
  );

  return (
    <section ref={scope} aria-labelledby="timeline-title" className="flex flex-col gap-3">
      <h2 id="timeline-title" className="pix-title px-1 text-[24px]">
        Recent logs
      </h2>

      {shown.length === 0 && (
        <div className="pix-card text-center text-[18px]">
          No logs yet. Your very first seed is waiting!
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {shown.map((log) => {
          const info = BRISTOL[log.stool_type];
          const color = COLORS[log.color];
          return (
            <li key={log.id} className="log-card pix-card flex gap-3 !py-3">
              {/* Bristol icon */}
              <div
                className="flex h-[52px] w-[64px] shrink-0 items-center justify-center"
                style={{
                  background: CATEGORY_COLOR[log.category],
                  boxShadow: "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d",
                }}
              >
                <PixelArt grid={info.icon} scale={4} title={`Type ${info.type}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <h3 className="text-[19px] font-bold leading-tight">{info.name}</h3>
                  <span className="text-[14px] text-plum-soft" suppressHydrationWarning>
                    {now ? relativeTime(log.logged_at, now) : ""}
                  </span>
                </div>

                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[15px] text-plum-soft">
                  <span>{CATEGORY_LABEL[log.category]}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      aria-hidden
                      className="inline-block size-3"
                      style={{ background: color.hex, boxShadow: "0 0 0 1.5px #2a1b3d" }}
                    />
                    {color.label}
                  </span>
                  {now && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{clockTime(log.logged_at)}</span>
                    </>
                  )}
                </div>

                {log.factors.length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-1">
                    {log.factors.map((f) => (
                      <li
                        key={f}
                        className="pix-chip !text-[13px]"
                        style={{ ["--face" as string]: TONE_FACE[FACTORS[f].tone] }}
                      >
                        <PixelArt grid={FACTORS[f].icon} scale={2} />
                        {FACTORS[f].label}
                      </li>
                    ))}
                  </ul>
                )}

                {log.notes && (
                  <p className="mt-1.5 text-[15px] italic text-plum-soft">“{log.notes}”</p>
                )}

                {onDelete && confirming === log.id && (
                  <div className="mt-2 flex items-center gap-2 text-[15px]">
                    <span>Remove this log?</span>
                    <button
                      type="button"
                      className="pix-btn pix-btn--sm !min-h-[34px] !py-1 !text-[15px]"
                      onClick={() => {
                        setConfirming(null);
                        onDelete(log.id);
                      }}
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      className="pix-btn pix-btn--cream pix-btn--sm !min-h-[34px] !py-1 !text-[15px]"
                      onClick={() => setConfirming(null)}
                    >
                      Keep
                    </button>
                  </div>
                )}
              </div>

              {onDelete && confirming !== log.id && (
                <button
                  type="button"
                  onClick={() => setConfirming(log.id)}
                  aria-label={`Remove ${info.name} log`}
                  className="-mr-1 -mt-1 self-start px-1.5 text-[18px] leading-none text-plum-soft hover:text-plum"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
