// Renders Mia (and a stardrop) to PNGs for the auth emails in
// supabase/templates. Email apps don't show SVG, so these need to be real
// images. Run again if Mia's pixels ever change:
//
//   npm run email:art
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CHIBI_FRAMES, CHIBI_H, CHIBI_W, MIA_PALETTE } from "../src/lib/mia/chibi.ts";

const OUT = new URL("../public/email/", import.meta.url);

function svgFor(grid, palette, scale) {
  const w = grid[0].length;
  const h = grid.length;
  let rects = "";
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = palette[ch];
      if (fill) rects += `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${fill}"/>`;
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges">${rects}</svg>`;
}

const STARDROP = [
  "...o...",
  "..olo..",
  "oolluoo",
  "oluwluo",
  ".ouuuo.",
  ".ouolo.",
  ".oo.oo.",
];
const STAR_PALETTE = { o: "#2a1b3d", l: "#cdb8ff", u: "#9a7ef0", w: "#ffffff" };

const jobs = [
  ["mia-wave.png", svgFor(CHIBI_FRAMES.waveHigh, MIA_PALETTE, 6)],
  ["mia-happy.png", svgFor(CHIBI_FRAMES.happy, MIA_PALETTE, 6)],
  ["stardrop.png", svgFor(STARDROP, STAR_PALETTE, 6)],
];

for (const [name, svg] of jobs) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(fileURLToPath(new URL(name, OUT)));
  console.log("wrote public/email/" + name);
}
console.log(`Mia is ${CHIBI_W * 6}x${CHIBI_H * 6}px`);
