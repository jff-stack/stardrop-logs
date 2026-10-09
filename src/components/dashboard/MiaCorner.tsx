"use client";

// Mia on her patch of grass with a speech bubble. The text types itself out,
// and tapping Mia or the bubble moves on to her next line.
// On phones, once she scrolls off the top a small floating copy takes over so
// her words stay on screen (desktop keeps the page as it is).
import { useImperativeHandle, useRef, type Ref } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import FloatingMia from "@/components/mia/FloatingMia";
import MiaSprite, { type MiaHandle } from "@/components/mia/MiaSprite";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePassedTop } from "@/hooks/usePassedTop";
import PixelArt from "@/components/ui/PixelArt";
import type { MiaState } from "@/lib/mia/animations";

gsap.registerPlugin(useGSAP);

const TAIL: string[] = ["...oo", "..occ", ".occc", "occcc", ".occc", "..occ", "...oo"];
const TAIL_PALETTE = { o: "#2a1b3d", c: "#fff8ef" };

const TUFT: string[] = [
  "..g...g..g....g...g..",
  ".gGg.gGg.gGg.gGg.gGg.",
  "ggggggggggggggggggggg",
  "GGGGGGGGGGGGGGGGGGGGG",
];

interface MiaCornerProps {
  text: string;
  state: MiaState;
  onNext: () => void;
  miaRef?: Ref<MiaHandle>;
}

export default function MiaCorner({ text, state, onNext, miaRef }: Readonly<MiaCornerProps>) {
  const scope = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const inPage = useRef<MiaHandle>(null);
  const floating = useRef<MiaHandle>(null);

  const isMobile = useIsMobile();
  const docked = usePassedTop(scope, isMobile);

  // Callers (particle bursts, boing) talk to whichever Mia is on screen.
  useImperativeHandle(
    miaRef,
    () => ({
      burst: (options) => (docked ? floating : inPage).current?.burst(options),
      boing: () => (docked ? floating : inPage).current?.boing(),
    }),
    [docked],
  );

  // Typewriter: reveal one character per step.
  useGSAP(
    () => {
      const el = textRef.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.textContent = text;
        return;
      }
      const counter = { n: 0 };
      gsap.to(counter, {
        n: text.length,
        duration: Math.min(2.4, text.length * 0.03),
        ease: `steps(${Math.max(1, text.length)})`,
        onUpdate: () => {
          el.textContent = text.slice(0, Math.round(counter.n));
        },
      });
      // Bubble gives a tiny hop whenever Mia starts a new line.
      gsap.fromTo(".mia-bubble", { y: 4 }, { y: 0, duration: 0.35, ease: "back.out(3)" });
    },
    { dependencies: [text], scope },
  );

  return (
    <section ref={scope} className="flex items-end gap-3" aria-label="Mia says">
      {/* Mia on her grass tuft */}
      <div className="relative flex shrink-0 flex-col items-center">
        <MiaSprite ref={inPage} state={state} scale={4} onTap={onNext} />
        <PixelArt grid={TUFT} scale={4} className="-mt-1" />
      </div>

      {/* Speech bubble */}
      <button
        type="button"
        onClick={onNext}
        className="mia-bubble pix-card mb-6 min-h-[100px] flex-1 cursor-pointer text-left"
      >
        <span className="absolute -left-[12px] top-6">
          <PixelArt grid={TAIL} palette={TAIL_PALETTE} scale={3} />
        </span>
        <span className="pix-chip absolute -top-4 left-3 text-[14px] font-semibold" style={{ ["--face" as string]: "var(--color-pink)" }}>
          Mia
        </span>
        <span ref={textRef} aria-hidden className="block pt-1 text-[17px] leading-snug" />
        <span className="sr-only" aria-live="polite">{text}</span>
        <span aria-hidden className="absolute bottom-2 right-3 animate-pulse text-[14px] text-plum-soft">
          tap ▸
        </span>
      </button>
      {isMobile && <FloatingMia show={docked} text={text} state={state} onTap={onNext} miaRef={floating} />}
    </section>
  );
}
