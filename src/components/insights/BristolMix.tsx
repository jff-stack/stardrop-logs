"use client";

// One bar per Bristol type for the last 30 days. Goal types (3 and 4) are
// green, the rest are muted, and every bar shows its count.
import PixelArt from "@/components/ui/PixelArt";
import { BRISTOL } from "@/lib/bristol";
import type { StoolType } from "@/lib/types";
import { ChartCard, LegendItem, MUTED, PRIZE } from "./chartKit";

export default function BristolMix({ mix }: Readonly<{ mix: { type: StoolType; count: number }[] }>) {
  const max = Math.max(1, ...mix.map((m) => m.count));

  return (
    <ChartCard
      title="Your mix (30 days)"
      subtitle="How often each type showed up."
      legend={
        <>
          <LegendItem color={PRIZE} label="goal types" />
          <LegendItem color={MUTED} label="other types" />
        </>
      }
    >
      <ul className="flex flex-col gap-1.5">
        {mix.map(({ type, count }) => {
          const info = BRISTOL[type];
          const goal = info.category === "healthy";
          return (
            <li key={type} className="flex items-center gap-2 text-[15px]">
              <span className="w-[22px] shrink-0">
                <PixelArt grid={info.icon} scale={2} />
              </span>
              <span className={`w-[124px] shrink-0 leading-tight ${goal ? "font-bold" : ""}`}>
                {type} · {info.name}
              </span>
              <span className="relative h-3.5 flex-1">
                <span
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${(count / max) * 100}%`,
                    minWidth: count ? 3 : 0,
                    background: goal ? PRIZE : MUTED,
                  }}
                />
              </span>
              <span className="w-6 shrink-0 text-right tabular-nums">{count}</span>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}
