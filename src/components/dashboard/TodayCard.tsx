"use client";

// Today at a glance. It counts every log today (you can log as many as you
// need), says whether that count looks normal, and offers a quiet-day button
// plus a few gentle ideas when nothing's happened yet.
import Link from "next/link";
import PixelArt, { ICONS, type PixelGrid } from "@/components/ui/PixelArt";
import PixelButton, { buttonClass, pressBoing, releaseBoing } from "@/components/ui/PixelButton";
import { BRISTOL, CATEGORY_COLOR } from "@/lib/bristol";
import { clockTime } from "@/lib/dates";
import type { Garden } from "@/lib/farm";
import { averagePerDay, todayRhythm, type RhythmLevel } from "@/lib/rhythm";
import { CHECK_IN_AFTER_DAYS, suggestionsFor } from "@/lib/suggestions";
import type { PoopLog } from "@/lib/types";

const MOON = ["..ooo..", ".oyyo..", "oyyo...", "oyyo...", "oyyo...", ".oyyo..", "..ooo.."];
const MOON_PALETTE = { o: "#2a1b3d", y: "#ffe48a" };
const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";

const SMILE: PixelGrid = [".ooooo.", "oyyyyyo", "oyoyoyo", "oyyyyyo", "oyoooyo", "oyyyyyo", ".ooooo."];
const DROP: PixelGrid = ["...o...", "..obo..", ".obbbo.", "obbBbbo", "obbbbbo", ".obbbo.", "..ooo.."];
const BELL: PixelGrid = ["...o...", "..opo..", ".opppo.", ".opppo.", "opppppo", "ooooooo", "...o..."];

// Every level gets an icon + words, never colour alone.
const LEVEL: Record<RhythmLevel, { face: string; icon: PixelGrid; tag: string }> = {
  great: { face: "var(--color-mint)", icon: SMILE, tag: "Normal" },
  okay: { face: "var(--color-butter)", icon: SMILE, tag: "Normal" },
  watch: { face: "var(--color-peach)", icon: DROP, tag: "Keep an eye on it" },
  talk: { face: "var(--color-pink)", icon: BELL, tag: "Worth a check-in" },
};

interface TodayCardProps {
  garden: Garden;
  today: PoopLog[];
  recent: PoopLog[];
  now: Date;
  pending: boolean;
  isDemo: boolean;
  onQuiet: () => void;
  onUndo: () => void;
}

export default function TodayCard(props: Readonly<TodayCardProps>) {
  const { garden, today, recent, now, pending, isDemo, onQuiet, onUndo } = props;
  const logHref = isDemo ? "/welcome" : "/log";

  if (today.length > 0) {
    const rhythm = todayRhythm(today);
    const level = LEVEL[rhythm.level];
    const avg = averagePerDay(recent, now);
    // Oldest first reads like a little timeline.
    const ordered = [...today].reverse();

    return (
      <section data-tour="today" className="pix-card" aria-labelledby="today-title">
        <div className="flex items-center justify-between gap-2">
          <h2 id="today-title" className="text-[20px] font-bold">Today</h2>
          <span className="pix-chip !text-[15px]" style={{ ["--face" as string]: "var(--color-butter)" }}>
            {today.length} {today.length === 1 ? "log" : "logs"}
          </span>
        </div>

        <ol className="mt-3 flex flex-wrap gap-2" aria-label="Today's logs">
          {ordered.map((log) => (
            <li
              key={log.id}
              className="flex items-center gap-1.5 py-1 pl-1 pr-2 text-[14px]"
              style={{ background: CATEGORY_COLOR[log.category], boxShadow: OUTLINE }}
            >
              <PixelArt grid={BRISTOL[log.stool_type].icon} scale={2} title={BRISTOL[log.stool_type].name} />
              {clockTime(log.logged_at)}
            </li>
          ))}
        </ol>

        <div className="mt-3 flex items-start gap-2.5 bg-cream-2 px-3 py-2.5" role="status">
          <span className="mt-0.5 shrink-0 p-1" style={{ background: level.face, boxShadow: OUTLINE }}>
            <PixelArt grid={level.icon} scale={2} />
          </span>
          <div>
            <p className="text-[17px] font-bold leading-tight">
              {rhythm.title}
              <span className="sr-only">: {level.tag}</span>
            </p>
            <p className="text-[15px] leading-snug text-plum-soft">{rhythm.detail}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[14px] text-plum-soft">7-day average: {avg} a day</span>
          <Link
            href={logHref}
            onPointerDown={pressBoing}
            onPointerUp={releaseBoing}
            onPointerLeave={releaseBoing}
            className={buttonClass("mint", "sm")}
          >
            + Log another
          </Link>
        </div>
      </section>
    );
  }

  if (garden.quietToday) {
    return (
      <section data-tour="today" className="pix-card pix-card--lilac flex items-center gap-3" aria-live="polite">
        <PixelArt grid={MOON} palette={MOON_PALETTE} scale={5} />
        <div className="flex-1">
          <h2 className="text-[19px] font-bold">Quiet day noted</h2>
          <p className="text-[15px] text-plum-soft">Your streak is safe. Log anytime if things change!</p>
        </div>
        <PixelButton color="cream" size="sm" onClick={onUndo} disabled={pending}>
          Undo
        </PixelButton>
      </section>
    );
  }

  const days = garden.daysSinceMovement;
  const longGap = days !== null && days >= CHECK_IN_AFTER_DAYS;

  return (
    <section data-tour="today" className="pix-card" aria-labelledby="today-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="today-title" className="text-[20px] font-bold">Today</h2>
        <span className="pix-chip !text-[15px]" style={{ ["--face" as string]: "var(--color-cream-2)" }}>
          nothing yet
        </span>
      </div>
      <p className="mt-1 text-[16px] text-plum-soft">Log each time you go. Twice or three times a day is fine!</p>

      {longGap && (
        <p className="mt-3 bg-cream-2 px-3 py-2 text-[15px]">
          It&apos;s been {days} days. If you feel bloated, in pain or unwell, or it keeps going, a
          pharmacist or doctor can help.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={logHref}
          onPointerDown={pressBoing}
          onPointerUp={releaseBoing}
          onPointerLeave={releaseBoing}
          className={buttonClass("mint", "sm")}
        >
          <PixelArt grid={ICONS.stardrop} scale={2} />
          Log one
        </Link>
        <PixelButton data-tour="quiet" color="lilac" size="sm" onClick={onQuiet} disabled={pending}>
          <PixelArt grid={MOON} palette={MOON_PALETTE} scale={2} />
          Quiet day
        </PixelButton>
      </div>

      {/* Ideas stay folded away so the card stays calm. */}
      <details className="group mt-3">
        <summary className="cursor-pointer list-none text-[16px] text-plum-soft underline underline-offset-4">
          <span className="group-open:hidden">Haven&apos;t gone? A few gentle ideas</span>
          <span className="hidden group-open:inline">Hide ideas</span>
        </summary>
        <ul className="mt-3 flex flex-col gap-2.5">
          {suggestionsFor(now).map((s) => (
            <li key={s.title} className="flex items-center gap-3">
              <span className="pix-well flex size-10 shrink-0 items-center justify-center bg-cream">
                <PixelArt grid={s.icon} scale={3} />
              </span>
              <span>
                <span className="block text-[16px] font-semibold leading-tight">{s.title}</span>
                <span className="block text-[14px] text-plum-soft">{s.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
