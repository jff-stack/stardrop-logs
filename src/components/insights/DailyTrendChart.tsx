"use client";

// Last 14 days, one dot per day at its average Bristol type. 1 (dry) is at
// the top and 7 (rainy) at the bottom, with the 3-4 goal band shaded.
// Quiet days get a hollow marker on the bottom line.
import { useState } from "react";
import { BRISTOL } from "@/lib/bristol";
import type { DayPoint } from "@/lib/insights";
import type { StoolType } from "@/lib/types";
import {
  ChartCard, ChartTooltip, CONTEXT, GOAL_BAND, GRID, INK_SOFT, LegendItem, PRIZE, SrTable,
} from "./chartKit";

const W = 320;
const H = 190;
const PAD = { l: 40, r: 8, t: 10, b: 30 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

const y = (type: number) => PAD.t + ((type - 1) / 6) * PLOT_H;
const inGoal = (t: number) => t >= 3 && t <= 4;

function describe(d: DayPoint) {
  if (d.avgType !== null) {
    const name = BRISTOL[Math.round(d.avgType) as StoolType].name;
    return `avg type ${d.avgType} (${name}) · ${d.logs} ${d.logs === 1 ? "log" : "logs"}`;
  }
  return d.quiet ? "quiet day" : "no check-in";
}

export default function DailyTrendChart({ days }: Readonly<{ days: DayPoint[] }>) {
  const [active, setActive] = useState<number | null>(null);
  const step = PLOT_W / days.length;
  const x = (i: number) => PAD.l + step * i + step / 2;

  // Line segments only between consecutive days that both have data.
  const segments = days.slice(1).flatMap((d, k) => {
    const prev = days[k];
    if (prev.avgType === null || d.avgType === null) return [];
    return [{ x1: x(k), y1: y(prev.avgType), x2: x(k + 1), y2: y(d.avgType) }];
  });

  const a = active === null ? null : days[active];

  return (
    <ChartCard
      title="The last 14 days"
      subtitle="Each dot is a day's average type. Aim for the green band."
      legend={
        <>
          <LegendItem color={GOAL_BAND} label="goal zone (3–4)" />
          <LegendItem color={PRIZE} label="in the zone" />
          <LegendItem color={CONTEXT} label="outside" />
          <LegendItem color={CONTEXT} label="quiet day" hollow />
        </>
      }
    >
      <div className="relative" onPointerLeave={() => setActive(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
          {/* Goal band */}
          <rect x={PAD.l} y={y(2.5)} width={PLOT_W} height={y(4.5) - y(2.5)} fill={GOAL_BAND} />
          {/* Grid + y labels */}
          {[1, 4, 7].map((t) => (
            <line key={t} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={GRID} />
          ))}
          <text x={PAD.l - 6} y={y(1) + 4} textAnchor="end" fontSize={11} fill={INK_SOFT}>dry</text>
          <text x={PAD.l - 6} y={y(3.5) + 4} textAnchor="end" fontSize={11} fill="#2a1b3d" fontWeight={700}>goal</text>
          <text x={PAD.l - 6} y={y(7) + 4} textAnchor="end" fontSize={11} fill={INK_SOFT}>rainy</text>

          {segments.map((s) => (
            <line key={`${s.x1}`} {...s} stroke="#2a1b3d" strokeOpacity={0.3} strokeWidth={2} />
          ))}

          {days.map((d, i) => (
            <g
              key={d.date.toISOString()}
              tabIndex={0}
              role="button"
              aria-label={`${d.date.toDateString()}: ${describe(d)}`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(i)}
              className="cursor-pointer outline-none"
            >
              <rect x={x(i) - step / 2} y={PAD.t} width={step} height={PLOT_H} fill="transparent" />
              {d.avgType !== null && (
                <rect
                  x={x(i) - (active === i ? 6 : 5)}
                  y={y(d.avgType) - (active === i ? 6 : 5)}
                  width={active === i ? 12 : 10}
                  height={active === i ? 12 : 10}
                  fill={inGoal(d.avgType) ? PRIZE : CONTEXT}
                  stroke="#fff8ef"
                  strokeWidth={2}
                  shapeRendering="crispEdges"
                />
              )}
              {d.quiet && (
                <rect
                  x={x(i) - 4}
                  y={y(7) - 4}
                  width={8}
                  height={8}
                  fill="none"
                  stroke={CONTEXT}
                  strokeWidth={2}
                  shapeRendering="crispEdges"
                />
              )}
              <text x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} fill={INK_SOFT}>
                {d.label}
              </text>
            </g>
          ))}
          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={PAD.t} y2={PAD.t + PLOT_H} stroke="#2a1b3d" strokeOpacity={0.35} />
          )}
        </svg>

        {a && active !== null && (
          <ChartTooltip x={(x(active) / W) * 100} y={((a.avgType ? y(a.avgType) : y(6.5)) / H) * 100}>
            {a.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}: {describe(a)}
          </ChartTooltip>
        )}
      </div>

      <SrTable
        caption="Average Bristol type per day, last 14 days"
        head={["Day", "Average type", "Logs", "Quiet"]}
        rows={days.map((d) => [d.date.toDateString(), d.avgType ?? "—", d.logs, d.quiet ? "yes" : "no"])}
      />
    </ChartCard>
  );
}
