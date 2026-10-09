"use client";

// For each factor: prize rate on days with it vs without it (last 60 days).
// These are patterns, not proof, so the wording stays gentle.
import PixelArt from "@/components/ui/PixelArt";
import { FACTORS } from "@/lib/factors";
import type { FactorImpact as Impact } from "@/lib/insights";
import { ChartCard, LegendItem, MUTED, PRIZE } from "./chartKit";

function verdict(diff: number) {
  if (diff >= 10) return "seems to help";
  if (diff <= -10) return "might be a trigger";
  return "no clear link yet";
}

export default function FactorImpact({ impacts }: Readonly<{ impacts: Impact[] }>) {
  return (
    <ChartCard
      title="What seems to help"
      subtitle="Prize rate on days with each factor vs without (60 days)."
      legend={
        impacts.length > 0 && (
          <>
            <LegendItem color={PRIZE} label="with factor" />
            <LegendItem color={MUTED} label="without" />
          </>
        )
      }
    >
      {impacts.length === 0 ? (
        <p className="text-[16px]">
          Tag a few more logs with factors (water, veggies, stress…) and I&apos;ll spot patterns!
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {impacts.map((f) => {
            const lo = Math.min(f.withRate, f.withoutRate);
            const hi = Math.max(f.withRate, f.withoutRate);
            return (
              <li key={f.factor}>
                <div className="flex items-center gap-2 text-[16px]">
                  <PixelArt grid={FACTORS[f.factor].icon} scale={2} />
                  <strong>{f.label}</strong>
                  <span className="text-plum-soft">{verdict(f.diff)}</span>
                </div>
                {/* Dumbbell: track, connector, two markers */}
                <div
                  className="relative mt-1.5 h-4"
                  role="img"
                  aria-label={`${f.label}: ${f.withRate}% prize with, ${f.withoutRate}% without`}
                >
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-plum/15" />
                  <span
                    className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-plum/40"
                    style={{ left: `${lo}%`, width: `${hi - lo}%` }}
                  />
                  <span
                    className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${f.withoutRate}%`, background: MUTED, boxShadow: "0 0 0 2px #fff8ef" }}
                  />
                  <span
                    className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${f.withRate}%`, background: PRIZE, boxShadow: "0 0 0 2px #fff8ef" }}
                  />
                </div>
                <p className="text-[14px] text-plum-soft">
                  {f.withRate}% with · {f.withoutRate}% without
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
