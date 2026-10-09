"use client";

// Three quick onboarding slides with Mia, then sign up / sign in.
import Link from "next/link";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import MiaSprite from "@/components/mia/MiaSprite";
import PixelArt, { ICONS, type PixelGrid } from "@/components/ui/PixelArt";
import { buttonClass, pressBoing, releaseBoing } from "@/components/ui/PixelButton";
import { CROP_ART } from "@/lib/crops";
import { BRISTOL } from "@/lib/bristol";
import type { MiaState } from "@/lib/mia/animations";

gsap.registerPlugin(useGSAP);

const SLIDES: { title: string; body: string; mia: MiaState; art: PixelGrid[] }[] = [
  {
    title: "Hi! I'm Mia.",
    body: "I'll help you keep an eye on your gut health, one cozy day at a time. No judgement, promise!",
    mia: "help",
    art: [ICONS.heart],
  },
  {
    title: "Log in a few taps",
    body: "Pick what it looked like, tap anything that's going on, done. Nothing awkward to type.",
    mia: "inspect",
    art: [BRISTOL[3].icon, BRISTOL[4].icon],
  },
  {
    title: "Grow your garden",
    body: "Healthy days grow parsnips, pumpkins and stardrops. Your logs stay private, just for you.",
    mia: "celebrate",
    art: [CROP_ART.parsnip, CROP_ART.pumpkin, CROP_ART.stardrop],
  },
];

export default function Welcome({ bye = false }: Readonly<{ bye?: boolean }>) {
  const [i, setI] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".slide-body > *", { y: 14, opacity: 0, duration: 0.45, ease: "back.out(2)", stagger: 0.07 });
    },
    { dependencies: [i], scope: card },
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pb-14 pt-8">
      <div className="flex items-center justify-center gap-2">
        <PixelArt grid={ICONS.stardrop} scale={5} />
        <h1 className="pix-title text-[34px] leading-none">Stardrop Logs</h1>
      </div>
      <p className="text-center text-[18px] text-cream">A cozy little gut-health diary</p>

      {bye && (
        <p role="status" className="pix-card pix-card--lilac !py-2 text-center text-[16px]">
          Your account and all your logs have been deleted. Take care!
        </p>
      )}

      <div className="flex justify-center pt-2">
        <MiaSprite state={slide.mia} scale={5} />
      </div>

      <div ref={card} className="pix-card flex min-h-[230px] flex-col gap-3 text-center">
        <div className="slide-body flex flex-col items-center gap-3">
          <div className="flex items-end justify-center gap-3">
            {slide.art.map((g) => (
              <PixelArt key={g.join("")} grid={g} scale={5} />
            ))}
          </div>
          <h2 className="text-[26px] font-bold leading-tight">{slide.title}</h2>
          <p className="text-[18px]">{slide.body}</p>
        </div>

        <div className="mt-auto flex items-center justify-center gap-2" aria-label={`Slide ${i + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, k) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Go to slide ${k + 1}`}
              aria-current={k === i}
              onClick={() => setI(k)}
              className="size-3"
              style={{ background: k === i ? "#2a1b3d" : "#ecd9c6" }}
            />
          ))}
        </div>
      </div>

      {last ? (
        <div className="flex flex-col gap-3">
          <Link href="/signup" onPointerDown={pressBoing} onPointerUp={releaseBoing} onPointerLeave={releaseBoing} className={buttonClass("pink")}>
            Start my garden
          </Link>
          <Link href="/login" className={buttonClass("cream")}>
            I already have one
          </Link>
        </div>
      ) : (
        <div className="flex gap-3">
          <Link href="/" className={`${buttonClass("cream")} flex-1`}>
            Peek first
          </Link>
          <button
            type="button"
            onClick={() => setI(i + 1)}
            onPointerDown={pressBoing}
            onPointerUp={releaseBoing}
            onPointerLeave={releaseBoing}
            className={`${buttonClass("mint")} flex-1`}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
