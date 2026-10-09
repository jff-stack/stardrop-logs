"use client";

// Recent logs grouped by day ("Today · 2 logs"), so a busy day reads as one
// little card instead of a pile. Older days fold away behind "Show more".
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import PixelArt from "@/components/ui/PixelArt";
import { BRISTOL, CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/bristol";
import { COLORS } from "@/lib/colors";
import { FACTORS } from "@/lib/factors";
import { clockTime, dayKey, daysAgo } from "@/lib/dates";
import type { PoopLog } from "@/lib/types";

gsap.registerPlugin(useGSAP);

const DAYS_SHOWN = 3;
const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";

interface LogTimelineProps {
  logs: PoopLog[];
  /** null until mounted; times only render in the browser (user's timezone). */
  now: Date | null;
  /** Omit to hide the remove button (sample garden). */
  onDelete?: (id: string) => void;
}

function dayTitle(day: string, now: Date) {
  if (day === dayKey(now)) return "Today";
  if (day === dayKey(daysAgo(1, now))) return "Yesterday";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

/** Logs (newest first) -> [{ day, logs }] in the same order. */
function groupByDay(logs: PoopLog[]) {
  const groups: { day: string; logs: PoopLog[] }[] = [];
  for (const log of logs) {
    const day = dayKey(new Date(log.logged_at));
    const last = groups[groups.length - 1];
    if (last?.day === day) last.logs.push(log);
    else groups.push({ day, logs: [log] });
  }
  return groups;
}

export default function LogTimeline({ logs, now, onDelete }: Readonly<LogTimelineProps>) {
  const scope = useRef<HTMLElement>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [daysShown, setDaysShown] = useState(DAYS_SHOWN);

  // Grouping needs the local timezone, so wait for the browser.
  const groups = now ? groupByDay(logs) : [];
  const shown = groups.slice(0, daysShown);
  const key = shown.map((g) => `${g.day}:${g.logs.length}`).join(",");

  useGSAP(
    () => {
      if (!key || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".day-card", { y: -18, opacity: 0, duration: 0.6, ease: "bounce.out", stagger: 0.08 });
    },
    { dependencies: [key], scope },
  );

  return (
    <section ref={scope} aria-labelledby="timeline-title" className="flex flex-col gap-3">
      <h2 id="timeline-title" className="pix-title px-1 text-[22px]">
        Recent logs
      </h2>

      {now && groups.length === 0 && (
        <div className="pix-card text-center text-[17px]">No logs yet. Your very first seed is waiting!</div>
      )}

      {shown.map((group) => (
        <article key={group.day} className="day-card pix-card !py-3" aria-label={dayTitle(group.day, now!)}>
          <header className="mb-1 flex items-baseline justify-between">
            <h3 className="text-[18px] font-bold">{dayTitle(group.day, now!)}</h3>
            <span className="text-[14px] text-plum-soft">
              {group.logs.length} {group.logs.length === 1 ? "log" : "logs"}
            </span>
          </header>

          <ol className="flex flex-col divide-y-2 divide-dashed divide-cream-3">
            {group.logs.map((log) => {
              const info = BRISTOL[log.stool_type];
              const color = COLORS[log.color];
              return (
                <li key={log.id} className="flex gap-3 py-2.5">
                  <span
                    className="flex h-[38px] w-[46px] shrink-0 items-center justify-center"
                    style={{ background: CATEGORY_COLOR[log.category], boxShadow: OUTLINE }}
                  >
                    <PixelArt grid={info.icon} scale={3} title={`Type ${info.type}`} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[17px] font-bold leading-tight">{info.name}</span>
                      <span className="shrink-0 text-[14px] text-plum-soft">{clockTime(log.logged_at)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-[14px] text-plum-soft">
                      <span>{CATEGORY_LABEL[log.category]}</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <span
                          aria-hidden
                          className="inline-block size-2.5"
                          style={{ background: color.hex, boxShadow: "0 0 0 1.5px #2a1b3d" }}
                        />
                        {color.label}
                      </span>
                      {log.factors.length > 0 && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="inline-flex gap-1" aria-label={log.factors.map((f) => FACTORS[f].label).join(", ")}>
                            {log.factors.map((f) => (
                              <PixelArt key={f} grid={FACTORS[f].icon} scale={2} title={FACTORS[f].label} />
                            ))}
                          </span>
                        </>
                      )}
                    </div>
                    {log.notes && <p className="mt-1 text-[14px] italic text-plum-soft">“{log.notes}”</p>}

                    {onDelete && confirming === log.id && (
                      <div className="mt-2 flex items-center gap-2 text-[15px]">
                        <span>Remove this log?</span>
                        <button
                          type="button"
                          className="pix-btn pix-btn--sm !min-h-[32px] !py-1 !text-[14px]"
                          onClick={() => {
                            setConfirming(null);
                            onDelete(log.id);
                          }}
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          className="pix-btn pix-btn--cream pix-btn--sm !min-h-[32px] !py-1 !text-[14px]"
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
                      aria-label={`Remove ${info.name} log from ${clockTime(log.logged_at)}`}
                      className="-mr-1 self-start px-1.5 text-[18px] leading-none text-plum-soft hover:text-plum"
                    >
                      ×
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </article>
      ))}

      {groups.length > daysShown && (
        <button
          type="button"
          onClick={() => setDaysShown((n) => n + 4)}
          className="self-center px-2 text-[16px] text-cream underline underline-offset-4"
        >
          Show more days
        </button>
      )}
    </section>
  );
}
