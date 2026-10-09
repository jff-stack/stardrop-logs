"use client";

// A short guided tour for brand-new farmers. Everything dims except the bit
// Mia is talking about, and a little card explains it. Steps point at
// elements by their data-tour attribute; a step with no target (or one that
// isn't on the page) is shown in the middle.
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import MiaSprite from "@/components/mia/MiaSprite";
import { buttonClass, pressBoing, releaseBoing } from "@/components/ui/PixelButton";
import type { MiaState } from "@/lib/mia/animations";

export interface TourStep {
  /** data-tour value to spotlight. Omit for a centred card. */
  target?: string;
  title: string;
  body: string;
  mia?: MiaState;
}

interface TourProps {
  steps: TourStep[];
  onDone: () => void;
  /** Where the last step's main button goes. */
  finishHref?: string;
  finishLabel?: string;
}

type Box = { top: number; left: number; width: number; height: number };

const PAD = 8;

const findTarget = (step: TourStep | undefined) =>
  step?.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;

export default function Tour({ steps, onDone, finishHref, finishLabel = "Let's go!" }: Readonly<TourProps>) {
  const visible = steps;
  const [i, setI] = useState(0);
  // Remember which step a box was measured for, so a stale one never shows.
  const [measured, setMeasured] = useState<{ step: number; box: Box } | null>(null);
  const box = measured?.step === i ? measured.box : null;
  const card = useRef<HTMLDivElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const step = visible[i];
  const last = i === visible.length - 1;

  // Follow the target while the page scrolls or resizes.
  useEffect(() => {
    const el = findTarget(step);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    let frame = 0;
    let prev = "";
    const track = () => {
      const r = el.getBoundingClientRect();
      const next = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
      const sig = `${Math.round(next.top)},${Math.round(next.left)},${Math.round(next.width)},${Math.round(next.height)}`;
      if (sig !== prev) {
        prev = sig;
        setMeasured({ step: i, box: next });
      }
      frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frame);
  }, [step, i]);

  // Pop the card in on every step and keep focus on the main button.
  useLayoutEffect(() => {
    nextBtn.current?.focus({ preventScroll: true });
    if (!card.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(card.current, { scale: 0.92, y: 8 }, { scale: 1, y: 0, duration: 0.45, ease: "back.out(2.4)" });
  }, [i]);

  const close = useCallback(() => onDone(), [onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!step) return null;

  // Card goes below the spotlight if there's room, otherwise above it.
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  let cardStyle: React.CSSProperties = { top: "50%", translate: "0 -50%" };
  if (box) {
    const below = box.top + box.height + 14;
    cardStyle = below + 230 < vh ? { top: below } : { bottom: Math.max(14, vh - box.top + 14) };
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* The dim layer. With a target, a big box-shadow around the
          spotlight does the dimming so the target itself stays bright. */}
      {box ? (
        <div
          aria-hidden
          className="pointer-events-none fixed"
          style={{
            ...box,
            boxShadow: "0 0 0 9999px rgb(26 14 54 / 0.62)",
            outline: "3px dashed var(--color-butter)",
            outlineOffset: 2,
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-plum/60" />
      )}
      {/* Swallow taps so the tour stays focused. */}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()} />

      <div className="fixed inset-x-0 flex justify-center px-4" style={cardStyle}>
        <div ref={card} className="pix-card w-full max-w-sm">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              <MiaSprite state={step.mia ?? "help"} scale={2} />
            </div>
            <div className="min-w-0">
              <h2 id="tour-title" className="text-[20px] font-bold leading-tight">{step.title}</h2>
              <p className="mt-1 text-[16px] leading-snug">{step.body}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex flex-1 gap-1.5" aria-label={`Step ${i + 1} of ${visible.length}`}>
              {visible.map((s, k) => (
                <span
                  key={`${s.title}-${k}`}
                  aria-hidden
                  className="h-2 w-2"
                  style={{ background: k <= i ? "#2a1b3d" : "#ecd9c6" }}
                />
              ))}
            </div>
            {!last && (
              <button type="button" onClick={close} className="px-2 text-[15px] text-plum-soft underline underline-offset-4">
                Skip
              </button>
            )}
            {last && finishHref ? (
              <Link
                href={finishHref}
                onClick={close}
                onPointerDown={pressBoing}
                onPointerUp={releaseBoing}
                onPointerLeave={releaseBoing}
                className={buttonClass("mint", "sm")}
              >
                {finishLabel}
              </Link>
            ) : (
              <button
                ref={nextBtn}
                type="button"
                onClick={() => (last ? close() : setI(i + 1))}
                onPointerDown={pressBoing}
                onPointerUp={releaseBoing}
                onPointerLeave={releaseBoing}
                className={buttonClass("mint", "sm")}
              >
                {last ? finishLabel : "Next"}
              </button>
            )}
          </div>
          {last && finishHref && (
            <button type="button" onClick={close} className="mt-2 w-full text-center text-[15px] text-plum-soft underline underline-offset-4">
              I&apos;ll look around first
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
