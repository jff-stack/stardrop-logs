"use client";

// Shows until there's a log for today: a few gentle ideas plus a "Quiet day"
// button for days with no movement. After a few days without going it also
// suggests talking to a pharmacist or doctor.
import PixelArt from "@/components/ui/PixelArt";
import PixelButton from "@/components/ui/PixelButton";
import type { Garden } from "@/lib/farm";
import { CHECK_IN_AFTER_DAYS, suggestionsFor } from "@/lib/suggestions";

const MOON = ["..ooo..", ".oyyo..", "oyyo...", "oyyo...", "oyyo...", ".oyyo..", "..ooo.."];
const MOON_PALETTE = { o: "#2a1b3d", y: "#ffe48a" };

interface TodayCardProps {
  garden: Garden;
  now: Date;
  pending: boolean;
  onQuiet: () => void;
  onUndo: () => void;
}

export default function TodayCard({ garden, now, pending, onQuiet, onUndo }: Readonly<TodayCardProps>) {
  if (garden.loggedToday) return null;

  if (garden.quietToday) {
    return (
      <section className="pix-card pix-card--lilac flex items-center gap-3" aria-live="polite">
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
    <section className="pix-card pix-card--sky" aria-labelledby="today-title">
      <h2 id="today-title" className="text-[20px] font-bold">Haven&apos;t gone yet today?</h2>
      <p className="text-[16px] text-plum-soft">Totally normal! A few gentle ideas:</p>

      <ul className="mt-3 flex flex-col gap-2.5">
        {suggestionsFor(now).map((s) => (
          <li key={s.title} className="flex items-center gap-3">
            <span className="pix-well flex size-11 shrink-0 items-center justify-center bg-cream">
              <PixelArt grid={s.icon} scale={4} />
            </span>
            <span>
              <span className="block text-[17px] font-semibold leading-tight">{s.title}</span>
              <span className="block text-[15px] text-plum-soft">{s.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      {longGap && (
        <p className="mt-3 bg-cream px-3 py-2 text-[15px]">
          It&apos;s been {days} days. If you feel bloated, in pain or unwell, or it keeps going,
          a pharmacist or doctor can help.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[14px] text-plum-soft">Day over with no movement?</span>
        <PixelButton color="lilac" size="sm" onClick={onQuiet} disabled={pending}>
          <PixelArt grid={MOON} palette={MOON_PALETTE} scale={3} />
          Quiet day
        </PixelButton>
      </div>
    </section>
  );
}
