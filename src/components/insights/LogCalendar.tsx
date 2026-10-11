"use client";

// A month calendar of the user's history. Days with something on them can be
// tapped to see that day's logs; empty days do nothing at all. This screen
// only looks back: there is deliberately no way to add or mark anything here.
//
// The marks are neutral. A day shows a sprout if it has logs (with a count
// from two up) or a moon if it was a quiet day. It never says whether a day
// was a good one.
//
// Where the data comes from: the page already has the last few months, so
// those months are drawn from it with no request. Older months are fetched
// once each, when first opened, and kept while the page is open.
import { useEffect, useRef, useState, useTransition } from "react";
import DayDetail from "./DayDetail";
import PixelArt, { type PixelGrid } from "@/components/ui/PixelArt";
import { ExportLink } from "@/components/settings/ExportLinks";
import {
  buildMonth, compareMonths, countByDay, dayLabel, isOpenable, monthKey, monthLabel, monthOf, monthRange,
  nextOpenable, shiftMonth, type Arrow, type CalendarCell, type MonthRef,
} from "@/lib/calendar";
import { dayKey, daysAgo } from "@/lib/dates";
import type { PoopLog } from "@/lib/types";
import type { MonthData } from "@/app/actions/history";

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";
// Same gold ring the garden puts round today's plot.
const TODAY_RING = "0 -3px 0 0 #f2b84b, 0 3px 0 0 #f2b84b, -3px 0 0 0 #f2b84b, 3px 0 0 0 #f2b84b";

const SPROUT: PixelGrid = [".oo.oo.", "ogoogno", "oggggno", ".oggno.", "..ogo..", "..ogo..", "..ooo.."];
const MOON: PixelGrid = ["..ooo..", ".oyyo..", "oyyo...", "oyyo...", "oyyo...", ".oyyo..", "..ooo.."];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ARROWS: readonly string[] = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];

// The pages load 120 days of history (HISTORY_DAYS in lib/data/dashboard.ts).
// A month counts as "already here" only if it starts a couple of days inside
// that, so nothing at the far edge is missed.
const LOADED_DAYS = 118;

type Loaded = { logs: PoopLog[]; quietDays: string[] };
type Fetched = { state: "loading" } | { state: "error"; error: string } | ({ state: "ready" } & Loaded);

interface LogCalendarProps {
  /** What the page already has: roughly the last four months. */
  logs: PoopLog[];
  quietDays: string[];
  now: Date;
  /** The user's first ever entry, so "previous" stops there. */
  firstEntry: { loggedAt: string | null; quietDay: string | null };
  /** Loads an older month. */
  fetchMonth: (from: string, to: string) => Promise<MonthData>;
  /** Removes a log. Resolves true when it's gone. */
  deleteLog: (id: string) => Promise<boolean>;
}

export default function LogCalendar({ logs, quietDays, now, firstEntry, fetchMonth, deleteLog }: Readonly<LogCalendarProps>) {
  const today = dayKey(now);
  const thisMonth = monthOf(today);
  const [month, setMonth] = useState<MonthRef>(thisMonth);
  const [fetched, setFetched] = useState<Record<string, Fetched>>({});
  const [openDay, setOpenDay] = useState<string | null>(null);
  // Logs removed here, hidden at once while the server catches up.
  const [removed, setRemoved] = useState<string[]>([]);
  const [, startTransition] = useTransition();
  const grid = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);

  // Arriving from "See older logs" (/insights#calendar): this section is
  // drawn after the page loads, so the browser's own jump would miss it.
  useEffect(() => {
    if (window.location.hash === "#calendar") section.current?.scrollIntoView({ block: "start" });
  }, []);

  const firstDays = [firstEntry.loggedAt ? dayKey(new Date(firstEntry.loggedAt)) : null, firstEntry.quietDay].filter(
    (d): d is string => d !== null,
  );
  const firstMonth = firstDays.length > 0 ? monthOf(firstDays.sort()[0]) : thisMonth;

  const isLoaded = (m: MonthRef) => `${monthKey(m)}-01` >= dayKey(daysAgo(LOADED_DAYS, now));

  const load = (m: MonthRef) => {
    const key = monthKey(m);
    setFetched((all) => ({ ...all, [key]: { state: "loading" } }));
    startTransition(async () => {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { from, to } = monthRange(m, zone, new Date());
      const res = await fetchMonth(from, to);
      setFetched((all) => ({
        ...all,
        [key]: res.ok ? { state: "ready", logs: res.logs, quietDays: res.quietDays } : { state: "error", error: res.error },
      }));
    });
  };

  const show = (m: MonthRef) => {
    setMonth(m);
    setOpenDay(null);
    if (!isLoaded(m) && !fetched[monthKey(m)]) load(m);
  };

  const entry = fetched[monthKey(month)];
  const source: Loaded | null = isLoaded(month) ? { logs, quietDays } : entry?.state === "ready" ? entry : null;
  const visible = (source?.logs ?? []).filter((l) => !removed.includes(l.id));
  const dayOf = (iso: string) => dayKey(new Date(iso));
  const rows = buildMonth(month.year, month.monthIndex, countByDay(visible.map((l) => l.logged_at), dayOf), new Set(source?.quietDays ?? []), today);

  const openable = rows.flat().filter(isOpenable);
  // One day is in the Tab order; arrow keys move between the rest.
  const tabStop = openable.find((c) => c.isToday)?.dayKey ?? openable.at(-1)?.dayKey;
  const focusDay = (key: string | null) => {
    if (key) grid.current?.querySelector<HTMLElement>(`[data-day="${key}"]`)?.focus();
  };

  const close = () => {
    const day = openDay;
    setOpenDay(null);
    // After the sheet has gone, so the day button exists to take focus.
    requestAnimationFrame(() => focusDay(day));
  };

  const remove = (id: string) => {
    setRemoved((ids) => [...ids, id]);
    startTransition(async () => {
      const ok = await deleteLog(id);
      if (!ok) {
        setRemoved((ids) => ids.filter((x) => x !== id));
        return;
      }
      // Drop it from the fetched copy too, so the month's counts stay right.
      setFetched((all) => {
        const cur = all[monthKey(month)];
        if (cur?.state !== "ready") return all;
        return { ...all, [monthKey(month)]: { ...cur, logs: cur.logs.filter((l) => l.id !== id) } };
      });
    });
  };

  const openLogs = openDay ? visible.filter((l) => dayOf(l.logged_at) === openDay) : [];
  const openCell = openDay ? rows.flat().find((c) => c.dayKey === openDay) : undefined;

  const atFirst = compareMonths(month, firstMonth) <= 0;
  const atLast = compareMonths(month, thisMonth) >= 0;

  return (
    <section ref={section} id="calendar" className="pix-card scroll-mt-4" aria-labelledby="calendar-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="calendar-title" className="text-[20px] font-bold leading-tight">Calendar</h2>
        <button
          type="button"
          onClick={() => show(thisMonth)}
          disabled={compareMonths(month, thisMonth) === 0}
          className="pix-btn pix-btn--cream pix-btn--sm min-h-[44px]"
        >
          Today
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => show(shiftMonth(month, -1))}
          disabled={atFirst}
          aria-label="Previous month"
          className="pix-btn pix-btn--cream pix-btn--sm min-h-[44px] min-w-[44px]"
        >
          ‹
        </button>
        <p className="text-[18px] font-bold" aria-live="polite">{monthLabel(month)}</p>
        <button
          type="button"
          onClick={() => show(shiftMonth(month, 1))}
          disabled={atLast}
          aria-label="Next month"
          className="pix-btn pix-btn--cream pix-btn--sm min-h-[44px] min-w-[44px]"
        >
          ›
        </button>
      </div>

      {!source && entry?.state === "error" ? (
        <div role="alert" className="mt-3 flex flex-col items-center gap-2 bg-cream-2 px-3 py-4 text-center text-[16px]">
          <p>{entry.error}</p>
          <button type="button" onClick={() => load(month)} className="pix-btn pix-btn--sm min-h-[44px]">
            Try again
          </button>
        </div>
      ) : (
        <div
          ref={grid}
          role="grid"
          aria-labelledby="calendar-title"
          aria-busy={!source}
          className={`mt-3 ${source ? "" : "animate-pulse"}`}
          onKeyDown={(e) => {
            const from = (e.target as HTMLElement).dataset?.day;
            if (!from || !ARROWS.includes(e.key)) return;
            e.preventDefault();
            focusDay(nextOpenable(rows, from, e.key as Arrow));
          }}
        >
          <div role="row" className="grid grid-cols-7 gap-1.5 px-[2px]">
            {WEEKDAYS.map((d) => (
              <span key={d} role="columnheader" className="pb-1 text-center text-[12px] text-plum-soft">
                {d}
              </span>
            ))}
          </div>
          {rows.map((row) => (
            <div key={row[0].dayKey} role="row" className="mt-1.5 grid grid-cols-7 gap-1.5 px-[2px]">
              {row.map((cell) => (
                <Day
                  key={cell.dayKey}
                  cell={cell}
                  tabStop={cell.dayKey === tabStop}
                  onOpen={() => setOpenDay(cell.dayKey)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {!source && entry?.state !== "error" && (
        <p role="status" className="mt-2 text-center text-[15px] text-plum-soft">Fetching that month…</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[14px]">
        <span className="inline-flex items-center gap-3 text-plum-soft">
          <span className="inline-flex items-center gap-1.5"><PixelArt grid={SPROUT} scale={2} /> logged</span>
          <span className="inline-flex items-center gap-1.5"><PixelArt grid={MOON} scale={2} /> quiet day</span>
        </span>
        <ExportLink>Export all your data</ExportLink>
      </div>

      {openDay && (
        <DayDetail
          dayKey={openDay}
          logs={openLogs}
          quiet={openCell?.hasQuiet ?? false}
          onDelete={remove}
          onClose={close}
        />
      )}
    </section>
  );
}

function Day({ cell, tabStop, onOpen }: Readonly<{ cell: CalendarCell; tabStop: boolean; onOpen: () => void }>) {
  const base = "relative flex aspect-square min-h-[44px] w-full flex-col items-center justify-center";

  // Days from the months either side: there to fill the row, nothing more.
  if (!cell.inMonth) {
    return (
      <span role="gridcell" aria-hidden className={`${base} text-[13px] text-plum-soft opacity-30`}>
        {cell.day}
      </span>
    );
  }

  const number = (
    <span className={`absolute left-1 top-0.5 text-[12px] leading-none ${cell.isToday ? "font-bold" : "text-plum-soft"}`}>
      {cell.day}
    </span>
  );
  const ring = cell.isToday ? TODAY_RING : OUTLINE;

  if (!isOpenable(cell)) {
    return (
      <span
        role="gridcell"
        aria-label={dayLabel(cell)}
        className={`${base} bg-cream-2 ${cell.isFuture ? "opacity-40" : ""}`}
        style={cell.isToday ? { boxShadow: TODAY_RING } : undefined}
      >
        {number}
      </span>
    );
  }

  return (
    <span role="gridcell" className="flex">
      <button
        type="button"
        data-day={cell.dayKey}
        tabIndex={tabStop ? 0 : -1}
        onClick={onOpen}
        aria-label={`${dayLabel(cell)}${cell.isToday ? ", today" : ""}`}
        aria-haspopup="dialog"
        className={`${base} cursor-pointer bg-cream outline-offset-2 focus-visible:outline-dashed focus-visible:outline-3 focus-visible:outline-butter-deep`}
        style={{ boxShadow: ring }}
      >
        {number}
        <span className="mt-2">
          <PixelArt grid={cell.count > 0 ? SPROUT : MOON} scale={2} />
        </span>
        {cell.count > 1 && (
          <span className="absolute bottom-0 right-0.5 text-[11px] font-bold leading-none">{cell.count}</span>
        )}
      </button>
    </span>
  );
}
