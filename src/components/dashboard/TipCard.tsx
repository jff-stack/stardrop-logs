"use client";

// Today's one tip. Short, with the reason underneath one tap away ("Why
// this?"), a way to put it away for the day, and one more if you want it.
// Everyday habits, not medical advice: /tips has the full list and sources.
import Link from "next/link";
import { useState } from "react";
import type { CoachTip } from "@/lib/coach";
import { EVIDENCE_LABEL, SOURCES } from "@/lib/tip-library";

interface TipCardProps {
  tip: CoachTip;
  why: string;
  /** What "Another tip" shows, or null when there isn't one. */
  extra: { tip: CoachTip; why: string } | null;
  /** Called when a tip that wasn't showing before comes on screen. */
  onShown: (id: string) => void;
  /** "Not now": put tips away until tomorrow. */
  onDismiss: () => void;
}

const CHIP = { ["--face" as string]: "var(--color-cream)" };

export default function TipCard({ tip, why, extra, onShown, onDismiss }: Readonly<TipCardProps>) {
  const [useExtra, setUseExtra] = useState(false);
  const [open, setOpen] = useState(false);

  const shown = useExtra && extra ? extra : { tip, why };
  const source = shown.tip.sourceId ? SOURCES[shown.tip.sourceId] : undefined;

  return (
    <section data-tour="tip" className="pix-card pix-card--lilac" aria-labelledby="tip-title">
      <h2 id="tip-title" className="text-[18px] font-bold">A tip for today</h2>
      <p className="mt-1 text-[17px] leading-snug">{shown.tip.text}</p>

      {open && (
        <div className="mt-2 bg-cream-2 px-3 py-2 text-[15px] leading-snug">
          <p>{shown.why}</p>
          {shown.tip.topic !== "insight" && (
            <p className="mt-1 text-plum-soft">Evidence: {EVIDENCE_LABEL[shown.tip.evidence]}.</p>
          )}
          {source && (
            <p className="mt-1">
              Source:{" "}
              {source.url ? (
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                  {source.label}
                </a>
              ) : (
                source.label
              )}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="pix-chip !text-[15px]"
          style={CHIP}
        >
          Why this?
        </button>
        {extra && !useExtra && (
          <button
            type="button"
            onClick={() => {
              setUseExtra(true);
              setOpen(false);
              onShown(extra.tip.id);
            }}
            className="pix-chip !text-[15px]"
            style={CHIP}
          >
            Another tip
          </button>
        )}
        <button type="button" onClick={onDismiss} className="pix-chip !text-[15px]" style={CHIP}>
          Not now
        </button>
        <Link href="/tips" className="text-[15px] underline underline-offset-4">
          More tips
        </Link>
      </div>
      <p className="mt-2 text-[13px] text-plum-soft">Everyday habits, not treatment. See a doctor for anything that worries you.</p>
    </section>
  );
}
