// The dusk backdrop behind every screen: banded sky, stars, a moon, drifting
// clouds, two rows of pines, a meadow and a few floating star-drops.
// It's all CSS animation with no client JS. Positions come from a seeded
// random so the server and the browser render exactly the same thing.
import type { CSSProperties } from "react";
import PixelArt, { ICONS, type PixelGrid } from "@/components/ui/PixelArt";
import { seededRandom } from "@/lib/random";

// Seeded so server and client markup always match.
const rand = seededRandom(20261009);

const STARS = Array.from({ length: 34 }, (_, i) => ({
  id: i,
  left: rand() * 100,
  top: rand() * 55,
  big: rand() > 0.78,
  delay: -rand() * 2.4,
  size: rand() > 0.5 ? 3 : 2,
}));

const DROPS = Array.from({ length: 7 }, (_, i) => ({
  id: i,
  left: 6 + rand() * 88,
  delay: -rand() * 14,
  duration: 11 + rand() * 8,
  hue: ["#ffe48a", "#cdb8ff", "#ff9ecb"][i % 3],
}));

// Art
const CLOUD_PALETTE = { w: "#ffe9f6", c: "#f6b9df", C: "#d98bcf" };

const CLOUD_BIG: PixelGrid = [
  "........wwww..............",
  "......wwccccw....wwww.....",
  "....wwccccccccwwwccccw....",
  "..wwcccccccccccccccccccw..",
  ".wccccccccccccccccccccccw.",
  "wccccccccccccccccccccccccc",
  "cccccccccccccccccccccccccc",
  ".CCCCCCCCCCCCCCCCCCCCCCCC.",
  "...CCCCCCCCCCCCCCCCCCCC...",
];

const CLOUD_SMALL: PixelGrid = [
  "....wwww......",
  "..wwccccww....",
  ".wcccccccccw..",
  "wccccccccccccw",
  ".CCCCCCCCCCCC.",
  "...CCCCCCCC...",
];

const MOON_PALETTE = { m: "#fff3c4", M: "#f2d38a" };
const MOON: PixelGrid = [
  "...mmmm..",
  ".mmmM....",
  "mmmM.....",
  "mmM......",
  "mmM......",
  "mmM......",
  "mmmM.....",
  ".mmmM....",
  "...mmmm..",
];

/**
 * A tiered pixel pine, returned as rects (in art pixels). Each tier widens by
 * 2px per row, then the next tier starts a little narrower, classic pine.
 */
function pine(cx: number, baseY: number, h: number) {
  const rects: { x: number; y: number; w: number }[] = [];
  for (let r = 0; r < h; r++) {
    const w = 2 + 2 * (r % 5) + 2 * Math.floor(r / 5);
    rects.push({ x: cx - w / 2, y: baseY - h + r, w });
  }
  return rects;
}

/** One repeating strip of trees (tile width in art pixels). */
function TreeRow({
  id, tile, trees, color, heightPx, scale, style,
}: Readonly<{
  id: string;
  tile: number;
  trees: [cx: number, h: number][];
  color: string;
  heightPx: number;
  scale: number;
  style?: CSSProperties;
}>) {
  const tileH = heightPx / scale;
  return (
    <svg className="absolute inset-x-0 w-full" height={heightPx} style={style} aria-hidden>
      <defs>
        <pattern
          id={id}
          width={tile * scale}
          height={heightPx}
          patternUnits="userSpaceOnUse"
        >
          <g transform={`scale(${scale})`} shapeRendering="crispEdges" fill={color}>
            {trees.flatMap(([cx, h]) =>
              pine(cx, tileH, h).map((r) => (
                <rect key={`${cx}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} />
              )),
            )}
            {/* solid band under the trees so rows overlap seamlessly */}
            <rect x={0} y={tileH - 3} width={tile} height={3} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export default function SkyScene() {
  return (
    <div aria-hidden className="sky-root pointer-events-none fixed inset-x-0 top-0 -z-10 overflow-hidden">
      {/* 1. Banded sky */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom,
            var(--color-dusk-1) 0 12%,
            var(--color-dusk-2) 12% 24%,
            var(--color-dusk-3) 24% 36%,
            var(--color-dusk-4) 36% 48%,
            var(--color-dusk-5) 48% 58%,
            var(--color-dusk-6) 58% 67%,
            var(--color-dusk-7) 67% 75%,
            var(--color-dusk-8) 75% 100%)`,
        }}
      />

      {/* 2. Stars + moon */}
      {STARS.map((s) =>
        s.big ? (
          <span
            key={s.id}
            className="absolute animate-twinkle"
            style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s` }}
          >
            <PixelArt grid={ICONS.sparkle} scale={2} />
          </span>
        ) : (
          <span
            key={s.id}
            className="absolute animate-twinkle bg-[#fff3c4]"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
            }}
          />
        ),
      )}
      <div className="absolute right-[12%] top-[7%]">
        <PixelArt grid={MOON} palette={MOON_PALETTE} scale={4} />
      </div>

      {/* 3. Drifting clouds (negative delays spread them across the sky) */}
      <div className="absolute left-0 top-[30%] animate-drift" style={{ animationDuration: "150s", animationDelay: "-40s" }}>
        <PixelArt grid={CLOUD_BIG} palette={CLOUD_PALETTE} scale={7} />
      </div>
      <div className="absolute left-0 top-[44%] animate-drift" style={{ animationDuration: "110s", animationDelay: "-85s" }}>
        <PixelArt grid={CLOUD_SMALL} palette={CLOUD_PALETTE} scale={6} />
      </div>
      <div className="absolute left-0 top-[52%] animate-drift opacity-90" style={{ animationDuration: "180s", animationDelay: "-130s" }}>
        <PixelArt grid={CLOUD_BIG} palette={CLOUD_PALETTE} scale={5} />
      </div>
      <div className="absolute left-0 top-[18%] animate-drift opacity-70" style={{ animationDuration: "200s", animationDelay: "-10s" }}>
        <PixelArt grid={CLOUD_SMALL} palette={CLOUD_PALETTE} scale={4} />
      </div>

      {/* 4. Treelines */}
      <TreeRow
        id="trees-back"
        tile={34}
        trees={[[6, 22], [17, 28], [28, 20]]}
        color="#46418f"
        heightPx={110}
        scale={3}
        style={{ bottom: 84 }}
      />
      <TreeRow
        id="trees-front"
        tile={46}
        trees={[[5, 17], [14, 24], [24, 15], [33, 21], [42, 18]]}
        color="#2f6a7c"
        heightPx={90}
        scale={3}
        style={{ bottom: 60 }}
      />

      {/* 5. Meadow */}
      <div
        className="absolute inset-x-0 bottom-0 h-[64px]"
        style={{
          backgroundColor: "#5fb873",
          backgroundImage: `
            radial-gradient(#ff9ecb 1.5px, transparent 2px),
            radial-gradient(#ffe48a 1.5px, transparent 2px),
            linear-gradient(#7fd48a 0 6px, transparent 6px)`,
          backgroundSize: "53px 23px, 37px 29px, 100% 100%",
          backgroundPosition: "11px 14px, 30px 26px, 0 0",
        }}
      />

      {/* 6. Floating star-drops */}
      {DROPS.map((d) => (
        <span
          key={d.id}
          className="absolute bottom-[70px] animate-float-up"
          style={{
            left: `${d.left}%`,
            width: 4,
            height: 4,
            background: d.hue,
            boxShadow: `0 0 8px 2px ${d.hue}`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
