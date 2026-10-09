// Tiny sprites drawn from text grids: one character per pixel, looked up in a
// palette ('.' is transparent). They render as crisp SVG rects, so there are
// no image files and no blur at any size.
//
//   <PixelArt grid={ICONS.heart} scale={4} />
export type PixelGrid = readonly string[];
export type PixelPalette = Readonly<Record<string, string>>;

/** Shared palette, mirrors the @theme tokens in globals.css. */
export const PALETTE: PixelPalette = {
  o: "#2a1b3d", // outline (plum)
  p: "#ff7fb6", // heart pink
  P: "#e8559a", // heart shade
  w: "#ffffff", // highlight
  y: "#ffe48a", // butter yellow
  Y: "#f2b84b", // gold shade
  u: "#9a7ef0", // stardrop purple
  l: "#cdb8ff", // stardrop light
  g: "#6cc475", // leaf
  G: "#3f8f5a", // leaf shade
  n: "#a5f0c5", // fresh sprout
  r: "#ff9f5a", // pumpkin orange
  R: "#e0703a", // pumpkin shade
  c: "#fff1d6", // parsnip cream
  C: "#f3d39b", // parsnip shade
  s: "#9c6a48", // soil
  S: "#6e4530", // soil dark
  b: "#6aa8f0", // water blue
  B: "#a8d8ff", // water light
  k: "#b98a66", // dry twig / husk
};

/** Small shared icons. */
export const ICONS = {
  heart: [
    ".oo.oo.",
    "owpoppo",
    "opppppo",
    ".oPppo.",
    "..oPo..",
    "...o...",
  ],
  star: [
    "...o...",
    "..oyo..",
    "ooyyyoo",
    "oyywyyo",
    ".oyyyo.",
    ".oyoyo.",
    ".oo.oo.",
  ],
  stardrop: [
    "...o...",
    "..olo..",
    "oolluoo",
    "oluwluo",
    ".ouuuo.",
    ".ouolo.",
    ".oo.oo.",
  ],
  sparkle: [
    "..w..",
    "..y..",
    "wywyw",
    "..y..",
    "..w..",
  ],
} as const satisfies Record<string, PixelGrid>;

export type IconName = keyof typeof ICONS;

/**
 * Convert a grid to rects, merging horizontal runs of the same colour into one
 * rect (about 3x fewer nodes than one rect per pixel).
 */
function toRects(grid: PixelGrid, palette: PixelPalette, offsetX = 0) {
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const fill = palette[ch];
      if (ch === "." || !fill) {
        x++;
        continue;
      }
      let run = 1;
      while (row[x + run] === ch) run++;
      rects.push({ x: x + offsetX, y, w: run, fill });
      x += run;
    }
  });
  return rects;
}

export function gridSize(grid: PixelGrid) {
  return { w: Math.max(...grid.map((r) => r.length)), h: grid.length };
}

const rectMarkup = (r: { x: number; y: number; w: number; fill: string }) =>
  `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.fill}"/>`;

/** SVG markup string, for imperative DOM creation (particles). */
export function pixelSvg(grid: PixelGrid, scale = 4, palette: PixelPalette = PALETTE) {
  const { w, h } = gridSize(grid);
  const body = toRects(grid, palette).map(rectMarkup).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges">${body}</svg>`;
}

/**
 * Pack equally-sized frames left->right into one SVG and return it as a
 * `url("data:...")` value for `background-image`. Used for sprite animation.
 */
export function pixelStripDataUri(frames: readonly PixelGrid[], palette: PixelPalette) {
  const { w, h } = gridSize(frames[0]);
  const body = frames.flatMap((g, i) => toRects(g, palette, i * w)).map(rectMarkup).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * frames.length} ${h}" shape-rendering="crispEdges">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

interface PixelArtProps {
  grid: PixelGrid;
  /** Screen pixels per art pixel. */
  scale?: number;
  palette?: PixelPalette;
  className?: string;
  /** Accessible label; omit for decorative art (then aria-hidden). */
  title?: string;
}

export default function PixelArt({
  grid,
  scale = 4,
  palette = PALETTE,
  className,
  title,
}: Readonly<PixelArtProps>) {
  const { w, h } = gridSize(grid);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * scale}
      height={h * scale}
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {toRects(grid, palette).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
