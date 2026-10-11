"use client";

// This week's logs, grouped by day ("Today · 2 logs"), newest first.
//
// "This week" starts on Sunday at midnight in the user's own timezone, so the
// list empties itself every Sunday. Nothing is deleted: older logs are on the
// Insights calendar. The page already has the last few months loaded, so the
// week is picked out here in the browser, with no extra request, and because
// `now` ticks along (useNow) an open page rolls over by itself at midnight.
import Link from "next/link";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import LogRow from "@/components/log/LogRow";
import { dayKey, daysAgo } from "@/lib/dates";
import type { PoopLog } from "@/lib/types";
import { isInCurrentWeek } from "@/lib/week";

gsap.registerPlugin(useGSAP);

// A week can't really reach this, but if it ever does the page stays light.
const MAX_ROWS = 100;

interface LogTimelineProps {
  /** Newest first. May hold more than this week; the rest is ignored here. */
  logs: PoopLog[];
  /** null until mounted; times only render in the browser (user's timezone). */
  now: Date | null;
  /** Omit to hide the remove button (sample garden). */
  onDelete?: (id: string) => void;
  /** Where "See older logs" goes. Omit to leave the link out (sample garden). */
  olderHref?: string;
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

export default function LogTimeline({ logs, now, onDelete, olderHref }: Readonly<LogTimelineProps>) {
  const scope = useRef<HTMLElement>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Both the week and the grouping need the local timezone, so wait for the browser.
  const zone = now ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const week = now ? logs.filter((l) => isInCurrentWeek(l.logged_at, now, zone)) : [];
  const groups = groupByDay(week.slice(0, MAX_ROWS));
  const key = groups.map((g) => `${g.day}:${g.logs.length}`).join(",");

  useGSAP(
    () => {
      if (!key || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".day-card", { y: -18, opacity: 0, duration: 0.6, ease: "bounce.out", stagger: 0.08 });
    },
    { dependencies: [key], scope },
  );

  const older = olderHref && (
    <Link href={olderHref} className="self-center px-2 text-[16px] text-cream underline underline-offset-4">
      See older logs
    </Link>
  );

  return (
    <section ref={scope} aria-labelledby="timeline-title" className="flex flex-col gap-3">
      <h2 id="timeline-title" className="pix-title px-1 text-[22px]">
        Recent logs
      </h2>

      {now && groups.length === 0 && (
        <div className="pix-card text-center text-[17px]">
          {logs.length === 0 ? "No logs yet. Your very first seed is waiting!" : "New week. Nothing logged yet."}
        </div>
      )}

      {groups.map((group) => (
        <article key={group.day} className="day-card pix-card !py-3" aria-label={dayTitle(group.day, now!)}>
          <header className="mb-1 flex items-baseline justify-between">
            <h3 className="text-[18px] font-bold">{dayTitle(group.day, now!)}</h3>
            <span className="text-[14px] text-plum-soft">
              {group.logs.length} {group.logs.length === 1 ? "log" : "logs"}
            </span>
          </header>

          <ol className="flex flex-col divide-y-2 divide-dashed divide-cream-3">
            {group.logs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                confirming={confirming === log.id}
                onConfirmChange={(asking) => setConfirming(asking ? log.id : null)}
                onDelete={onDelete}
              />
            ))}
          </ol>
        </article>
      ))}

      {week.length > MAX_ROWS && (
        <p className="px-2 text-center text-[15px] text-cream">
          Showing the newest {MAX_ROWS}. The rest of this week is in the calendar.
        </p>
      )}

      {now && older}
    </section>
  );
}
