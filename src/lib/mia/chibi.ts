// Chibi Mia, drawn in code. Each frame is a 22x25 grid (one character per
// pixel), built from a base pose plus a few changed rows, so a blink only
// touches the eye rows.
//
// Same look as her portrait: long wavy dark hair, red flower clip, lilac
// jacket over a white top, jeans and little brown boots.
/** Mia's palette. One char -> one colour; '.' is transparent. */
export const MIA_PALETTE = {
  o: "#2a1b3d", // outline (soft plum-black, gentler than pure black)
  h: "#3b2536", // hair
  H: "#6b4459", // hair shine
  s: "#e3a06f", // skin
  S: "#c47f55", // skin shade
  e: "#2a1b3d", // eyes
  w: "#ffffff", // eye sparkle
  b: "#ff8fab", // blush
  m: "#b03a5b", // mouth
  c: "#ff4d6d", // flower clip
  C: "#6ccf5a", // clip leaf
  j: "#b892f0", // jacket
  J: "#8a62cf", // jacket shade
  t: "#fff7f0", // white top
  d: "#4466b8", // jeans
  D: "#2f4a8f", // jeans shade
  f: "#6b3f2a", // boots
} as const;

export const CHIBI_W = 22;
export const CHIBI_H = 25;

/**
 * Face rows share a frame: 2 empty, hair edge "ohh", 12 face pixels, "hho",
 * 2 empty. `face("sswesssswess")` builds a full 22-px row from the middle 12.
 * Face index guide:  0 1 2 3 4 5 | 6 7 8 9 10 11   (centre is between 5|6)
 */
const face = (mid: string) => `..ohh${mid}hho..`;

/*
 * BASE, idle pose, facing forward, arms relaxed.
 *                                          0123456789012345678901
 */
const BASE: string[] = [
  "......oooooooooo......", //  0 crown
  ".....ohhhhhhhhhho.....", //  1
  "....ohhHHhhhhhhcCo....", //  2 shine + flower clip
  "...ohHhhhhhhhhhhcho...", //  3
  "..ohhhhhhhhhhhhhhhho..", //  4 fringe
  face("hhsssssssshh"),      //  5
  face("hssssssssssh"),      //  6 fringe tips
  face("sswesssswess"),      //  7 eyes, sparkle top-left
  face("sseesssseess"),      //  8
  face("sbeesssseebs"),      //  9 blush
  face("sbssmssmssbs"),      // 10 little "w" smile…
  face("hSsssmmssssS"),      // 11 …and its bottom
  "..ohhhhhossssohhhhho..",  // 12 neck
  "..ohhojjjttttjjjohho..",  // 13 shoulders
  "..ohojjjjttttjjjjoho..",  // 14
  ".ohhojjjjttttjjjjohho.",  // 15 hair falls past shoulders
  ".ohojJjjjttttjjjJjoho.",  // 16
  ".ohosJjjjttttjjjJsoho.",  // 17 hands
  "..ooSoJjjjjjjjjJoSoo..",  // 18
  "....oJJJJJJJJJJJJo....",  // 19 jacket hem
  ".....oddddddddddo.....",  // 20 jeans
  ".....odddDooDdddo.....",  // 21
  ".....odddo..odddo.....",  // 22
  "....offffo..offffo....",  // 23 boots
  "....oooooo..oooooo....",  // 24
];

/** Clone BASE and replace whole rows (validated to be exactly 22 wide). */
function frame(overrides: Record<number, string>): string[] {
  const rows = [...BASE];
  for (const [i, row] of Object.entries(overrides)) {
    if (row.length !== CHIBI_W) {
      throw new Error(`Mia frame row ${i} is ${row.length} wide, expected ${CHIBI_W}`);
    }
    rows[Number(i)] = row;
  }
  return rows;
}

/** Replace a single pixel at (row, col). */
function poke(rows: string[], row: number, col: number, ch: string) {
  rows[row] = rows[row].slice(0, col) + ch + rows[row].slice(col + 1);
}

// Expressions
const BLINK = {
  7: face("ssssssssssss"),
  8: face("sseesssseess"), // closed-eye lines
  9: face("sbssssssssbs"),
};

const HAPPY = {
  // ^ ^ eyes and a big open smile
  7: face("ssssssssssss"),
  8: face("sseesssseess"),
  9: face("bessessesseb"),
  10: face("ssssmmmmssss"),
  11: face("hSsssmmssssS"),
};

const LOOK = {
  // glancing to the side, "hmm, let's see..."
  7: face("ssswesssswes"),
  8: face("ssseessssees"),
  9: face("sbseesssseeb"),
  10: face("ssssssmsssss"),
  11: face("hSsssssssssS"),
};

// Arms
/**
 * Right arm raised, drawn in front of her hair (cols 18–21).
 * `high` lifts the hand one pixel so two frames make a wave.
 */
function wave(high: boolean, expression: Record<number, string>): string[] {
  const rows = frame(expression);
  // Tuck away the resting right hand.
  poke(rows, 17, 17, "j");
  poke(rows, 18, 17, "o");

  const top = high ? 8 : 9; // first skin row of the 2×2 hand
  // Outline cap above the hand.
  poke(rows, top - 1, 19, "o");
  poke(rows, top - 1, 20, "o");
  // 2×2 hand with outline either side.
  for (let r = top; r <= top + 1; r++) {
    poke(rows, r, 18, "o");
    poke(rows, r, 19, "s");
    poke(rows, r, 20, r === top ? "s" : "S");
    poke(rows, r, 21, "o");
  }
  // Sleeve from the wrist down to the shoulder.
  for (let r = top + 2; r <= 14; r++) {
    poke(rows, r, 18, "o");
    poke(rows, r, 19, "j");
    poke(rows, r, 20, "J");
    poke(rows, r, 21, "o");
  }
  return rows;
}

// Legs
const STEP_LEFT = {
  22: "....offffo..odddo.....",
  23: "....oooooo..offffo....",
  24: "............oooooo....",
};
const STEP_RIGHT = {
  22: ".....odddo..offffo....",
  23: "....offffo..oooooo....",
  24: "....oooooo............",
};

/** Every frame, in strip order. animations.ts sequences these by name. */
export const CHIBI_FRAMES = {
  idle: BASE,
  blink: frame(BLINK),
  happy: frame(HAPPY),
  waveHigh: wave(true, HAPPY),
  waveLow: wave(false, HAPPY),
  stepLeft: frame(STEP_LEFT),
  stepRight: frame(STEP_RIGHT),
  look: frame(LOOK),
} satisfies Record<string, string[]>;

export type ChibiFrameName = keyof typeof CHIBI_FRAMES;
export const CHIBI_ORDER = Object.keys(CHIBI_FRAMES) as ChibiFrameName[];
export const CHIBI_INDEX = Object.fromEntries(
  CHIBI_ORDER.map((n, i) => [n, i]),
) as Record<ChibiFrameName, number>;
