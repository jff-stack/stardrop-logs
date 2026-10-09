"use client";

// A 4x3 bed of soil plots, one per day for the last 12 days. Crops pop up
// one after another, tapping a plot asks Mia about it, and the day you just
// logged gets a little bloom.
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import PixelArt, { ICONS } from "@/components/ui/PixelArt";
import ParticleBurst, { type ParticleBurstHandle } from "@/components/fx/ParticleBurst";
import { CROP_ART } from "@/lib/crops";
import type { Garden as GardenData, Plot } from "@/lib/farm";
import { PLOT_DAYS } from "@/lib/farm";

gsap.registerPlugin(useGSAP);

interface GardenProps {
  garden: GardenData | null;
  onPlotTap: (plot: Plot) => void;
  /** Day to celebrate (just logged), YYYY-MM-DD. */
  bloomDay?: string | null;
}

function soilStyle(watered: boolean) {
  return {
    backgroundColor: watered ? "var(--color-soil-wet)" : "var(--color-soil)",
    backgroundImage: `
      radial-gradient(rgb(0 0 0 / 0.16) 1.5px, transparent 2px),
      repeating-linear-gradient(to bottom, transparent 0 11px, rgb(0 0 0 / 0.13) 11px 14px)`,
    backgroundSize: "10px 10px, 100% 100%",
  };
}

export default function Garden({ garden, onPlotTap, bloomDay }: Readonly<GardenProps>) {
  const scope = useRef<HTMLDivElement>(null);
  const fx = useRef<ParticleBurstHandle>(null);
  const ready = garden !== null;

  // Crops sprout one after another once real data is in.
  useGSAP(
    () => {
      if (!ready || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".crop", {
        scale: 0,
        y: 10,
        duration: 0.55,
        ease: "back.out(2.6)",
        stagger: 0.06,
        transformOrigin: "50% 100%",
      });
      gsap.to(".today-seed", { y: -3, duration: 0.5, ease: "steps(1)", yoyo: true, repeat: -1 });
    },
    { dependencies: [ready], scope },
  );

  // The fresh crop wobbles in big, with sparkles from its plot.
  useGSAP(
    () => {
      if (!ready || !bloomDay) return;
      const plot = scope.current?.querySelector<HTMLElement>(`[data-day="${bloomDay}"]`);
      const crop = plot?.querySelector(".crop");
      if (!plot || !crop) return;
      plot.scrollIntoView({ block: "center", behavior: "smooth" });
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        crop,
        { scale: 0, rotation: -25 },
        { scale: 1, rotation: 0, duration: 1.1, delay: 0.5, ease: "elastic.out(1.2, 0.35)", transformOrigin: "50% 100%" },
      );
      const box = plot.getBoundingClientRect();
      const host = scope.current!.getBoundingClientRect();
      gsap.delayedCall(0.6, () =>
        fx.current?.burst({
          kind: "mixed",
          count: 14,
          spread: 90,
          originX: (box.left + box.width / 2 - host.left) / host.width,
          originY: (box.top + box.height / 3 - host.top) / host.height,
        }),
      );
    },
    { dependencies: [ready, bloomDay], scope },
  );

  const plots: (Plot | null)[] = garden?.plots ?? Array.from({ length: PLOT_DAYS }, () => null);

  return (
    <section ref={scope} className="pix-card pix-card--mint" aria-labelledby="garden-title">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="garden-title" className="text-[22px] font-bold">My Garden</h2>
        <span className="text-[15px] text-plum-soft">last 12 days</span>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {plots.map((plot, i) => {
          if (!plot) {
            return <div key={`empty-${i}`} className="aspect-square opacity-60" style={soilStyle(false)} />;
          }
          const art = plot.crop === "empty" ? null : CROP_ART[plot.crop];
          const label = plot.isToday
            ? "Today"
            : plot.date.toLocaleDateString(undefined, { weekday: "short" });
          return (
            <button
              key={plot.day}
              data-day={plot.day}
              type="button"
              onClick={() => onPlotTap(plot)}
              aria-label={`${label}: ${plot.crop}`}
              className="group flex cursor-pointer flex-col items-center gap-1"
            >
              <span
                className="relative flex aspect-square w-full items-end justify-center transition-transform duration-100 group-active:translate-y-0.5"
                style={{
                  ...soilStyle(plot.watered),
                  boxShadow: plot.isToday
                    ? "0 -3px 0 0 #f2b84b, 0 3px 0 0 #f2b84b, -3px 0 0 0 #f2b84b, 3px 0 0 0 #f2b84b"
                    : "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d",
                }}
              >
                {art && (
                  <span className={`crop block w-[78%] ${plot.crop === "seed" ? "today-seed" : ""}`}>
                    <PixelArt grid={art} scale={4} className="h-auto w-full" />
                  </span>
                )}
                {plot.count > 1 && (
                  <span className="absolute right-0.5 top-0.5 bg-cream px-1 text-[12px] leading-tight">
                    ×{plot.count}
                  </span>
                )}
              </span>
              <span className={`text-[13px] leading-none ${plot.isToday ? "font-bold" : "text-plum-soft"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Weekly stats */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[15px]">
        <span className="pix-chip" style={{ ["--face" as string]: "var(--color-butter)" }}>
          <PixelArt grid={ICONS.star} scale={2} />
          {garden ? `${garden.healthyDays7}/7 prize days` : "…"}
        </span>
        <span className="pix-chip" style={{ ["--face" as string]: "var(--color-sky)" }}>
          <PixelArt grid={ICONS.sparkle} scale={2} />
          {garden ? `${garden.checkedInDays7}/7 days checked in` : "…"}
        </span>
      </div>
      <ParticleBurst ref={fx} />
    </section>
  );
}
