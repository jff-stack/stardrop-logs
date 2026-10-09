"use client";

// The big floating button, always under your thumb. Signed-out visitors get
// the try-it demo instead of the real log book.
import Link from "next/link";
import PixelArt, { ICONS } from "@/components/ui/PixelArt";
import { buttonClass, pressBoing, releaseBoing } from "@/components/ui/PixelButton";

export default function LogFab({ isDemo }: Readonly<{ isDemo: boolean }>) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-20 flex justify-center"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
    >
      <Link
        href={isDemo ? "/try" : "/log"}
        onPointerDown={pressBoing}
        onPointerUp={releaseBoing}
        onPointerLeave={releaseBoing}
        className={`${buttonClass("pink")} pointer-events-auto !min-h-[60px] !px-7 !text-[22px]`}
      >
        <span className="inline-block animate-wiggle">
          <PixelArt grid={ICONS.stardrop} scale={4} />
        </span>
        {isDemo ? "Try a log" : "New log"}
      </Link>
    </div>
  );
}
