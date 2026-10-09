"use client";

// Prize rate for each of the last 8 weeks. Only one series, so no legend; the
// latest week gets a label and the rest show on tap or hover.
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ChartCard, ChartTooltip, GRID, INK_SOFT, PRIZE, SrTable } from "./chartKit";
import type { WeekPoint } from "@/lib/insights";

gsap.registerPlugin(useGSAP);

const W = 320;
const H = 168;
const PAD = { l: 34, r: 6, t: 14, b: 26 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

export default function WeeklyChart({ weeks }: Readonly<{ weeks: WeekPoint[] }>) {
  const scope = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const band = PLOT_W / weeks.length;
  const barW = Math.min(24, band - 8);
  const y = (pct: number) => PAD.t + PLOT_H * (1 - pct / 100);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".wk-bar", {
        scaleY: 0,
        transformOrigin: "50% 100%",
        duration: 0.6,
        ease: "back.out(1.6)",
        stagger: 0.06,
      });
    },
    { scope },
  );

  const last = weeks.length - 1;
  const a = active === null ? null : weeks[active];

  return (
    <ChartCard title="Prize rate, week by week" subtitle="Share of logs that were Bristol 3–4 (the goal).">
      <div ref={scope} className="relative" onPointerLeave={() => setActive(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" shapeRendering="crispEdges">
          {/* Recessive grid: 0 / 50 / 100% */}
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
              <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill={INK_SOFT}>
                {v}%
              </text>
            </g>
          ))}

          {weeks.map((w, i) => {
            const cx = PAD.l + band * i + band / 2;
            const h = w.rate === null ? 0 : (PLOT_H * w.rate) / 100;
            return (
              <g
                key={w.start.toISOString()}
                tabIndex={0}
                role="button"
                aria-label={`${w.label}: ${w.rate === null ? "no logs" : `${w.rate}% prize, ${w.logs} logs`}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(i)}
                className="cursor-pointer outline-none"
              >
                {/* Hit target: the whole column band, bigger than the mark */}
                <rect x={cx - band / 2} y={PAD.t} width={band} height={PLOT_H} fill="transparent" />
                {w.rate === null ? (
                  <text x={cx} y={y(0) - 4} textAnchor="middle" fontSize={11} fill={INK_SOFT}>–</text>
                ) : (
                  <rect
                    className="wk-bar"
                    x={cx - barW / 2}
                    y={y(0) - Math.max(h, 2)}
                    width={barW}
                    height={Math.max(h, 2)}
                    fill={PRIZE}
                    opacity={active === null || active === i ? 1 : 0.55}
                  />
                )}
                {/* Direct label on the latest week only */}
                {i === last && w.rate !== null && (
                  <text x={cx} y={y(w.rate) - 5} textAnchor="middle" fontSize={12} fontWeight={700} fill="#2a1b3d">
                    {w.rate}%
                  </text>
                )}
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={i === last ? 11 : 10}
                  fontWeight={i === last ? 700 : 400}
                  fill={i === last ? "#2a1b3d" : INK_SOFT}
                >
                  {w.label}
                </text>
              </g>
            );
          })}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="#2a1b3d" strokeWidth={1.5} />
        </svg>

        {a && active !== null && (
          <ChartTooltip
            x={((PAD.l + band * active + band / 2) / W) * 100}
            y={(y(a.rate ?? 0) / H) * 100}
          >
            Week of {a.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}:{" "}
            {a.rate === null ? "no logs" : `${a.rate}% prize · ${a.logs} logs`}
          </ChartTooltip>
        )}
      </div>

      <SrTable
        caption="Prize rate by week"
        head={["Week starting", "Prize rate", "Logs"]}
        rows={weeks.map((w) => [w.start.toDateString(), w.rate === null ? "—" : `${w.rate}%`, w.logs])}
      />
    </ChartCard>
  );
}
