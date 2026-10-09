"use client";

// Three quick slides on why tracking is worth it, with Mia and a little
// animated picture each. Swipe or tap Next, then sign up / sign in.
import Link from "next/link";
import { useRef, useState, type ComponentType } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import MiaSprite from "@/components/mia/MiaSprite";
import PixelArt, { ICONS } from "@/components/ui/PixelArt";
import { buttonClass, pressBoing, releaseBoing } from "@/components/ui/PixelButton";
import type { MiaState } from "@/lib/mia/animations";
import { GrowChart, TapDemo, WeekStory } from "./WelcomeArt";

gsap.registerPlugin(useGSAP);

const SLIDES: { title: string; body: string; mia: MiaState; Art: ComponentType }[] = [
  {
    title: "Your gut tells a story",
    body: "A quick log each time you go shows patterns you'd never notice, and gives you real notes to bring along if you ever see a doctor.",
    mia: "help",
    Art: WeekStory,
  },
  {
    title: "Logging takes 5 seconds",
    body: "Tap a shape, tap a colour, done. Went three times today? Log all three. I'll tell you if that's normal.",
    mia: "inspect",
    Art: TapDemo,
  },
  {
    title: "See what actually helps",
    body: "Charts show how your weeks are going and which habits help. Healthy days grow a cute little garden!",
    mia: "celebrate",
    Art: GrowChart,
  },
];

const SWIPE = 45;

export default function Welcome({ bye = false }: Readonly<{ bye?: boolean }>) {
  const [i, setI] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".slide-text > *", { y: 12, opacity: 0, duration: 0.45, ease: "back.out(2)", stagger: 0.07 });
    },
    { dependencies: [i], scope: card },
  );

  const go = (to: number) => setI(Math.max(0, Math.min(SLIDES.length - 1, to)));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pb-12 pt-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PixelArt grid={ICONS.stardrop} scale={4} />
          <span className="pix-title text-[26px] leading-none">Stardrop Logs</span>
        </div>
        {!last && (
          <button type="button" onClick={() => go(SLIDES.length - 1)} className="text-[16px] text-cream underline underline-offset-4">
            Skip
          </button>
        )}
      </div>

      {bye && (
        <p role="status" className="pix-card pix-card--lilac !py-2 text-center text-[16px]">
          Your account and all your logs have been deleted. Take care!
        </p>
      )}

      <div className="flex justify-center pt-1">
        <MiaSprite state={slide.mia} scale={4} />
      </div>

      <div
        ref={card}
        className="pix-card flex min-h-[330px] touch-pan-y flex-col gap-4 text-center"
        aria-roledescription="carousel"
        onPointerDown={(e) => {
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (dx < -SWIPE) go(i + 1);
          else if (dx > SWIPE) go(i - 1);
        }}
      >
        <div className="flex min-h-[110px] items-center justify-center pt-2" aria-hidden>
          <slide.Art key={i} />
        </div>
        <div className="slide-text flex flex-col gap-2" aria-live="polite">
          <h1 className="text-[26px] font-bold leading-tight">{slide.title}</h1>
          <p className="text-[17px] leading-snug">{slide.body}</p>
        </div>

        <div className="mt-auto flex items-center justify-center gap-2">
          {SLIDES.map((s, k) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Slide ${k + 1} of ${SLIDES.length}`}
              aria-current={k === i}
              onClick={() => go(k)}
              className="h-3 transition-[width] duration-200"
              style={{ width: k === i ? 24 : 12, background: k === i ? "#2a1b3d" : "#ecd9c6" }}
            />
          ))}
        </div>
      </div>

      {last ? (
        <div className="flex flex-col gap-3">
          <Link href="/signup" onPointerDown={pressBoing} onPointerUp={releaseBoing} onPointerLeave={releaseBoing} className={buttonClass("pink")}>
            Start my garden
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/login" className={buttonClass("cream", "sm")}>
              I have an account
            </Link>
            <Link href="/" className={buttonClass("cream", "sm")}>
              Peek at a sample
            </Link>
          </div>
          <p className="text-center text-[15px] text-cream">
            Private by default: only you can see your logs. A diary, not medical advice:
            for health worries, please see a doctor.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => go(i + 1)}
          onPointerDown={pressBoing}
          onPointerUp={releaseBoing}
          onPointerLeave={releaseBoing}
          className={buttonClass("mint")}
        >
          Next
        </button>
      )}
    </main>
  );
}
