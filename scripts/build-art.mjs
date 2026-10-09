// Draws Mia's art that can't be rendered live by the app:
//   - PNGs for the auth emails (email apps don't show SVG)
//   - the browser-tab icon (a chibi Mia face) and the iPhone home-screen icon
// Run again if Mia's pixels ever change:
//
//   npm run art
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CHIBI_FRAMES, CHIBI_H, CHIBI_W, MIA_PALETTE } from "../src/lib/mia/chibi.ts";

const OUT = new URL("../public/email/", import.meta.url);
const APP = new URL("../src/app/", import.meta.url);

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

// Tab icon: just her face (top 13 rows of the idle frame, without the
// transparent side columns), closed off with an outline row, on a pink tile.
const FACE = [...CHIBI_FRAMES.idle.slice(0, 13).map((row) => row.slice(2, 20)), "..oooooooooooooo.."];
const TILE = 20;
const faceRects = (scale, dx, dy) => {
  let rects = "";
  FACE.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = MIA_PALETTE[ch];
      if (fill) rects += `<rect x="${(x + dx) * scale}" y="${(y + dy) * scale}" width="${scale}" height="${scale}" fill="${fill}"/>`;
    });
  });
  return rects;
};
const dx = (TILE - FACE[0].length) / 2;
const dy = (TILE - FACE.length) / 2;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE} ${TILE}" shape-rendering="crispEdges">
<rect width="${TILE}" height="${TILE}" rx="4" fill="#ffd9ea"/>
${faceRects(1, dx, dy)}
</svg>
`;
writeFileSync(fileURLToPath(new URL("icon.svg", APP)), icon);
console.log("wrote src/app/icon.svg");

// iOS ignores SVG icons, so it gets a 180x180 PNG (square; iOS rounds it).
const S = 9;
const apple = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE * S}" height="${TILE * S}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffd9ea"/>${faceRects(S, dx, dy)}</svg>`;
await sharp(Buffer.from(apple)).png({ compressionLevel: 9 }).toFile(fileURLToPath(new URL("apple-icon.png", APP)));
console.log("wrote src/app/apple-icon.png");
