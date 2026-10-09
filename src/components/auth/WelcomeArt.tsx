"use client";

// Little animated pictures for the welcome slides. Each one is drawn in code
// (pixel grids + divs) and loops gently while its slide is showing.
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import PixelArt, { ICONS, type PixelGrid } from "@/components/ui/PixelArt";
import { BRISTOL, CATEGORY_COLOR } from "@/lib/bristol";
import { CROP_ART } from "@/lib/crops";
import type { StoolType } from "@/lib/types";

gsap.registerPlugin(useGSAP);

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const HAND: PixelGrid = [
  "..oo....",
  ".owwo...",
  ".owwo...",
  ".owwoooo",
  "oowwwwwo",
  "owwwwwwo",
  ".owwwwo.",
  "..oooo..",
];

/** A week that slowly gets better: dry days turning into prize days. */
export function WeekStory() {
  const scope = useRef<HTMLDivElement>(null);
  const week: StoolType[] = [1, 2, 2, 3, 4, 4, 4];
  const letters = ["M", "T", "W", "T", "F", "S", "S"];

  useGSAP(
    () => {
      if (calm()) return;
      gsap.from(".week-tile", { y: 16, opacity: 0, duration: 0.4, ease: "back.out(2.5)", stagger: 0.09 });
      gsap.to(".week-heart", { y: -4, duration: 0.45, ease: "steps(2)", yoyo: true, repeat: -1 });
    },
    { scope },
  );

  return (
    <div ref={scope} className="flex flex-col items-center gap-2">
      <div className="flex items-end gap-1.5">
        {week.map((t, k) => (
          <div key={k} className="week-tile flex flex-col items-center gap-1">
            <span
              className="flex h-8 w-9 items-center justify-center"
              style={{ background: CATEGORY_COLOR[BRISTOL[t].category], boxShadow: OUTLINE }}
            >
              <PixelArt grid={BRISTOL[t].icon} scale={2} />
            </span>
            <span className="text-[12px] leading-none text-plum-soft">{letters[k]}</span>
          </div>
        ))}
      </div>
      <span className="week-heart">
        <PixelArt grid={ICONS.heart} scale={4} />
      </span>
    </div>
  );
}

/** A finger tapping through three choices, like the real log screen. */
export function TapDemo() {
  const scope = useRef<HTMLDivElement>(null);
  const picks: StoolType[] = [2, 4, 6];

  useGSAP(
    () => {
      if (calm()) return;
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4 });
      // Hop the hand from card to card; the card under it lights up.
      [0, 1, 2, 1].forEach((k, step) => {
        tl.to(".tap-hand", { x: (k - 1) * 70, duration: 0.45, ease: "power2.inOut" }, step === 0 ? 0 : ">0.35")
          .to(".tap-hand", { y: 6, duration: 0.1, yoyo: true, repeat: 1 })
          .set(".tap-card", { backgroundColor: "#fff8ef" }, "<")
          .set(`.tap-card-${k}`, { backgroundColor: CATEGORY_COLOR[BRISTOL[picks[k]].category] }, "<")
          .fromTo(`.tap-card-${k}`, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: "elastic.out(1.2, 0.4)" }, "<");
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative flex flex-col items-center pb-7">
      <div className="flex gap-3">
        {picks.map((t, k) => (
          <span
            key={t}
            className={`tap-card tap-card-${k} flex h-[58px] w-[58px] items-center justify-center`}
            style={{ background: k === 1 ? CATEGORY_COLOR.healthy : "#fff8ef", boxShadow: OUTLINE }}
          >
            <PixelArt grid={BRISTOL[t].icon} scale={3} />
          </span>
        ))}
      </div>
      <span className="tap-hand absolute bottom-0 left-1/2 -ml-3">
        <PixelArt grid={HAND} scale={3} />
      </span>
    </div>
  );
}

/** Bars climbing week by week next to a growing crop. */
export function GrowChart() {
  const scope = useRef<HTMLDivElement>(null);
  const bars = [28, 36, 34, 52, 66, 84];

  useGSAP(
    () => {
      if (calm()) return;
      gsap.from(".grow-bar", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.6, ease: "back.out(1.8)", stagger: 0.1 });
      gsap.from(".grow-crop", { scale: 0, transformOrigin: "50% 100%", duration: 0.7, delay: 0.6, ease: "elastic.out(1.2, 0.4)", stagger: 0.15 });
    },
    { scope },
  );

  return (
    <div ref={scope} className="flex items-end justify-center gap-4">
      <div className="flex h-[72px] items-end gap-1.5 bg-cream-2 px-2 pt-2" style={{ boxShadow: OUTLINE }} aria-hidden>
        {bars.map((h, k) => (
          <span
            key={k}
            className="grow-bar block w-3.5"
            style={{ height: `${h}%`, background: k === bars.length - 1 ? "#2f9e6a" : "#c9bfe0" }}
          />
        ))}
      </div>
      <div className="flex items-end gap-1">
        <span className="grow-crop"><PixelArt grid={CROP_ART.parsnip} scale={3} /></span>
        <span className="grow-crop"><PixelArt grid={CROP_ART.pumpkin} scale={3} /></span>
        <span className="grow-crop"><PixelArt grid={CROP_ART.stardrop} scale={4} /></span>
      </div>
    </div>
  );
}
