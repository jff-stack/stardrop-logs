"use client";

// One small row under the Today card for catching up on yesterday: mark it as
// a quiet day if it was missed, or undo that. Older days never get an action.
import PixelArt from "@/components/ui/PixelArt";
import PixelButton from "@/components/ui/PixelButton";
import { QUIET_COPY, type YesterdayChoice } from "@/lib/quiet";

const MOON = ["..ooo..", ".oyyo..", "oyyo...", "oyyo...", "oyyo...", ".oyyo..", "..ooo.."];
const MOON_PALETTE = { o: "#2a1b3d", y: "#ffe48a" };

interface YesterdayRowProps {
  choice: YesterdayChoice;
  pending: boolean;
  onMark: (day: string) => void;
  onUndo: (day: string) => void;
}

export default function YesterdayRow({ choice, pending, onMark, onUndo }: Readonly<YesterdayRowProps>) {
  const quiet = choice.action === "undo";
  return (
    <section
      className={`pix-card !py-2.5 flex items-center gap-3 ${quiet ? "pix-card--lilac" : ""}`}
      aria-label="Yesterday"
    >
      {quiet && <PixelArt grid={MOON} palette={MOON_PALETTE} scale={3} />}
      <p className="flex-1 text-[16px]">{quiet ? QUIET_COPY.yesterdayQuiet : QUIET_COPY.yesterdayEmpty}</p>
      {quiet ? (
        <PixelButton color="cream" size="sm" onClick={() => onUndo(choice.day)} disabled={pending} className="min-h-[44px]">
          {QUIET_COPY.undoButton}
        </PixelButton>
      ) : (
        <PixelButton color="lilac" size="sm" onClick={() => onMark(choice.day)} disabled={pending} className="min-h-[44px]">
          {QUIET_COPY.markButton}
        </PixelButton>
      )}
    </section>
  );
}
