"use client";

// A small Mia + speech bubble that floats at the top of a phone screen after
// her spot in the page has scrolled away. It slides in with a little bounce
// and slides back out when you scroll up to her. Phones only: the parent
// only renders it on mobile, and the page itself never changes layout.
import type { Ref } from "react";
import MiaSprite, { type MiaHandle } from "@/components/mia/MiaSprite";
import type { MiaState } from "@/lib/mia/animations";

interface FloatingMiaProps {
  show: boolean;
  text: string;
  state: MiaState;
  onTap: () => void;
  miaRef?: Ref<MiaHandle>;
}

export default function FloatingMia({ show, text, state, onTap, miaRef }: Readonly<FloatingMiaProps>) {
  return (
    <div
      // Wrapper ignores touches so the page scrolls right through the gaps.
      className="pointer-events-none fixed inset-x-0 z-30 px-3 md:hidden"
      style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
    >
      <div
        aria-hidden={!show}
        inert={!show}
        className={`pix-card pointer-events-auto mx-auto flex max-w-md items-center gap-2 !py-2 !pl-2 !pr-3 transition-[transform,opacity] ${
          show
            ? "translate-y-0 opacity-100 duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            : "-translate-y-[140%] opacity-0 duration-300 ease-in"
        }`}
      >
        <div className="shrink-0">
          <MiaSprite ref={miaRef} state={state} scale={2} paceDistance={6} onTap={onTap} />
        </div>
        <button type="button" onClick={onTap} className="max-h-[7.5rem] min-w-0 flex-1 overflow-hidden text-left">
          <span className="block text-[15px] leading-snug">{text}</span>
        </button>
      </div>
    </div>
  );
}
