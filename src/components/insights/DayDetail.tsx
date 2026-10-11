"use client";

// The sheet that opens when a calendar day is tapped: that day's logs, in the
// same rows as the Garden's list. On a phone it slides up from the bottom; on
// a wider screen it sits in the middle.
//
// While it's open, Tab stays inside it, Escape or a tap outside closes it,
// and the calendar puts focus back on the day it came from.
import { useEffect, useRef, useState } from "react";
import LogRow from "@/components/log/LogRow";
import PixelArt from "@/components/ui/PixelArt";
import { dayHeading } from "@/lib/calendar";
import type { PoopLog } from "@/lib/types";

const MOON = ["..ooo..", ".oyyo..", "oyyo...", "oyyo...", "oyyo...", ".oyyo..", "..ooo.."];
const MOON_PALETTE = { o: "#2a1b3d", y: "#ffe48a" };

interface DayDetailProps {
  dayKey: string;
  /** That day's logs, newest first. */
  logs: PoopLog[];
  /** True when the day is a quiet day with no logs. */
  quiet: boolean;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export default function DayDetail({ dayKey, logs, quiet, onDelete, onClose }: Readonly<DayDetailProps>) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Start on the close button, so Enter or Space dismisses it straight away.
  useEffect(() => {
    closeButton.current?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    // Keep Tab going round inside the sheet.
    const items = [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    if (items.length === 0) return;
    const first = items[0];
    const last = items.at(-1)!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const title = dayHeading(dayKey);
  const summary = logs.length > 0 ? (logs.length === 1 ? "1 log" : `${logs.length} logs`) : quiet ? "Quiet day" : "Nothing logged";

  return (
    // No slide or fade: it simply appears, which also suits reduced motion.
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[rgb(26_14_54/0.55)]"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-detail-title"
        // Lets the list scroll by touch or wheel without the page behind moving.
        data-lenis-prevent
        className="pix-card relative flex max-h-[80dvh] w-full max-w-md flex-col gap-2 overflow-y-auto sm:mx-4"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="day-detail-title" className="text-[20px] font-bold leading-tight">{title}</h2>
            <p className="text-[15px] text-plum-soft">{summary}</p>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            className="pix-btn pix-btn--cream pix-btn--sm min-h-[44px]"
          >
            Close
          </button>
        </header>

        {logs.length > 0 ? (
          <ol className="flex flex-col divide-y-2 divide-dashed divide-cream-3">
            {logs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                confirming={confirming === log.id}
                onConfirmChange={(asking) => setConfirming(asking ? log.id : null)}
                onDelete={onDelete}
              />
            ))}
          </ol>
        ) : (
          <p className="flex items-center gap-3 bg-cream-2 px-3 py-2.5 text-[16px]">
            {quiet && <PixelArt grid={MOON} palette={MOON_PALETTE} scale={3} />}
            {quiet ? "Quiet day" : "Nothing left on this day."}
          </p>
        )}
      </div>
    </div>
  );
}
