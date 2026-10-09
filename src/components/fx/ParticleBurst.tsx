"use client";

// Pixel hearts, stars and sparkles that pop out and fall.
// Particles are plain DOM nodes rather than React state, so even a big burst
// doesn't re-render anything. Each one removes itself when it's done.
//
//   const fx = useRef<ParticleBurstHandle>(null);
//   fx.current?.burst({ kind: "heart", count: 12 });
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { gsap } from "gsap";
import { ICONS, pixelSvg, type IconName } from "@/components/ui/PixelArt";

export type ParticleKind = IconName | "mixed";

export interface BurstOptions {
  kind?: ParticleKind;
  count?: number;
  /** Origin within the layer, 0–1 (default: centre-ish, slightly high). */
  originX?: number;
  originY?: number;
  /** How far particles travel, in px. */
  spread?: number;
  /** Pixel scale of each particle. */
  scale?: number;
}

export interface ParticleBurstHandle {
  burst: (options?: BurstOptions) => void;
}

// Pre-render the SVG strings once per scale (cheap to clone afterwards).
const svgCache = new Map<string, string>();
function iconSvg(name: IconName, scale: number) {
  const key = `${name}@${scale}`;
  let svg = svgCache.get(key);
  if (!svg) {
    svg = pixelSvg(ICONS[name], scale);
    svgCache.set(key, svg);
  }
  return svg;
}

const MIXED: IconName[] = ["heart", "star", "sparkle", "heart", "sparkle", "stardrop"];

interface ParticleBurstProps {
  ref?: Ref<ParticleBurstHandle>;
  className?: string;
}

export default function ParticleBurst({ ref, className = "" }: ParticleBurstProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const live = useRef(new Set<gsap.core.Timeline>());

  useImperativeHandle(ref, () => ({
    burst({
      kind = "mixed",
      count = 10,
      originX = 0.5,
      originY = 0.35,
      spread = 90,
      scale = 3,
    } = {}) {
      const layer = layerRef.current;
      if (!layer) return;
      // Respect reduced motion: a single static-ish twinkle instead of a burst.
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const n = reduce ? 1 : count;

      const { width, height } = layer.getBoundingClientRect();
      const ox = width * originX;
      const oy = height * originY;

      for (let i = 0; i < n; i++) {
        const name: IconName =
          kind === "mixed" ? MIXED[Math.floor(Math.random() * MIXED.length)] : kind;

        const el = document.createElement("span");
        el.innerHTML = iconSvg(name, scale);
        el.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;translate:-50% -50%;will-change:transform,opacity;`;
        layer.appendChild(el);

        // Fan mostly upward (-160° ... -20°) like a fountain.
        const angle = gsap.utils.random(-160, -20) * (Math.PI / 180);
        const dist = gsap.utils.random(spread * 0.45, spread);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;

        const tl = gsap.timeline({
          onComplete: () => {
            el.remove();
            live.current.delete(tl);
          },
        });
        tl.fromTo(
          el,
          { x: 0, y: 0, scale: 0, rotation: 0, opacity: 1 },
          {
            x: dx,
            y: dy,
            scale: 1,
            rotation: gsap.utils.random(-25, 25),
            duration: reduce ? 0.2 : gsap.utils.random(0.35, 0.55),
            ease: "back.out(2)",
          },
        )
          // Gravity: drift down & fade, in chunky steps for a pixel feel.
          .to(el, {
            y: dy + gsap.utils.random(30, 70),
            x: dx * 1.15,
            opacity: 0,
            duration: reduce ? 0.3 : gsap.utils.random(0.6, 0.9),
            ease: "power1.in",
          })
          .to(el, { scale: 0.6, duration: 0.3, ease: "steps(3)" }, "<0.2");
        live.current.add(tl);
      }
    },
  }), []);

  // Kill any in-flight particles when the component unmounts.
  useEffect(() => {
    const set = live.current;
    return () => {
      set.forEach((tl) => tl.kill());
      set.clear();
    };
  }, []);

  return (
    <div
      ref={layerRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-visible ${className}`}
    />
  );
}
