"use client";

// Dev-only playground: flip through Mia's states and eyeball all the pixel art.
import { useRef, useState } from "react";
import MiaSprite, { type MiaHandle } from "@/components/mia/MiaSprite";
import PixelButton from "@/components/ui/PixelButton";
import PixelArt from "@/components/ui/PixelArt";
import { MIA_ANIMATIONS, type MiaState } from "@/lib/mia/animations";
import { CHIBI_FRAMES, CHIBI_ORDER, MIA_PALETTE } from "@/lib/mia/chibi";
import { CROP_ART } from "@/lib/crops";
import { BRISTOL_LIST } from "@/lib/bristol";
import { FACTOR_LIST } from "@/lib/factors";

const STATES = Object.keys(MIA_ANIMATIONS) as MiaState[];

export default function MiaLab() {
  const [state, setState] = useState<MiaState>("idle");
  const mia = useRef<MiaHandle>(null);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
      <h1 className="pix-title text-[28px]">Mia Lab</h1>

      <section className="pix-card flex flex-col items-center gap-3">
        <div className="flex h-48 w-full items-end justify-center overflow-hidden pb-2">
          <MiaSprite ref={mia} state={state} scale={6} paceDistance={70} />
        </div>
        <p className="text-[16px]">state: {state}</p>
      </section>

      <section className="grid grid-cols-2 gap-2">
        {STATES.map((s) => (
          <PixelButton
            key={s}
            color={s === state ? "mint" : "cream"}
            size="sm"
            aria-pressed={s === state}
            onClick={() => setState(s)}
          >
            {s}
          </PixelButton>
        ))}
        <PixelButton
          color="lilac"
          className="col-span-2"
          onClick={() => mia.current?.burst({ kind: "mixed", count: 24, spread: 140 })}
        >
          ✦ Burst! ✦
        </PixelButton>
      </section>

      <section className="pix-card">
        <h2 className="mb-2 text-[18px] font-bold">Chibi frames</h2>
        <div className="flex flex-wrap gap-3">
          {CHIBI_ORDER.map((name) => (
            <figure key={name} className="flex flex-col items-center">
              <PixelArt grid={CHIBI_FRAMES[name]} palette={MIA_PALETTE} scale={3} />
              <figcaption className="text-[13px]">{name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="pix-card">
        <h2 className="mb-2 text-[18px] font-bold">Crops · Bristol · Factors</h2>
        <div className="flex flex-wrap items-end gap-3">
          {Object.entries(CROP_ART).map(([k, g]) => (
            <PixelArt key={k} grid={g} scale={4} title={k} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {BRISTOL_LIST.map((b) => (
            <PixelArt key={b.type} grid={b.icon} scale={4} title={b.name} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {FACTOR_LIST.map((f) => (
            <PixelArt key={f.key} grid={f.icon} scale={4} title={f.label} />
          ))}
        </div>
      </section>
    </main>
  );
}
