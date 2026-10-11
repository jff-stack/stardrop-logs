// The avatar catalogue: every part a user can pick, as data.
//
// An avatar is a 16x16 head-and-shoulders picture built from layers. Shapes
// (hair, outfit, eyes, accessory) are text grids like the rest of the app's
// art, but drawn with "meaning" letters instead of fixed colours:
//
//   s S  skin, skin shadow        c C  outfit, outfit shadow
//   h H  hair, hair shine         a A  accessory, accessory shadow
//   b    background               e    eyes
//   o    outline   w white   m mouth   (these three never change colour)
//   .    see-through
//
// Colours (skin tone, hair colour, outfit colour, background) are separate
// catalogue entries that say what those letters mean, so one hair drawing
// works in every hair colour.
//
// `free` is here for the shop that's coming: a paid part is the same kind of
// entry with free: false. Today everything is free, and only free parts can
// be saved (see AvatarSchema in validation.ts).
import type { PixelGrid } from "@/components/ui/PixelArt";

export const AVATAR_SIZE = 16;

export const AVATAR_SLOTS = ["skin", "hair", "hairColor", "outfit", "outfitColor", "eyes", "accessory", "bg"] as const;
export type AvatarSlot = (typeof AVATAR_SLOTS)[number];

/** What the editor calls each slot. */
export const SLOT_LABEL: Record<AvatarSlot, string> = {
  skin: "Skin",
  hair: "Hair",
  hairColor: "Hair colour",
  outfit: "Outfit",
  outfitColor: "Outfit colour",
  eyes: "Face",
  accessory: "Extras",
  bg: "Backdrop",
};

export interface AvatarPart {
  /** Stored in the database. Lower-case letters, digits and "_" only, 24 characters at most. */
  id: string;
  slot: AvatarSlot;
  name: string;
  free: boolean;
  /** Shape parts: 16 rows of 16. */
  grid?: PixelGrid;
  /** What this part sets the meaning letters to. */
  colors?: Readonly<Record<string, string>>;
}

const BLANK = ".".repeat(AVATAR_SIZE);

/** A full 16-row grid from a few rows starting at `top`; the rest is see-through. */
function rows(top: number, lines: string[]): PixelGrid {
  return Array.from({ length: AVATAR_SIZE }, (_, y) => lines[y - top] ?? BLANK);
}

// The layers every avatar has, whatever was picked.

/** Neck and shoulders. Mostly hidden under the outfit. */
export const BODY: PixelGrid = rows(11, [
  ".....osSSso.....",
  "...oossssssoo...",
  "..osssssssssso..",
  ".osssssssssssso.",
  ".osssssssssssso.",
]);

export const HEAD: PixelGrid = rows(2, [
  "....oooooooo....",
  "...osssssssso...",
  "...osssssssso...",
  "...osssssssso...",
  "...osssssssso...",
  "...osssssssso...",
  "...osssssssso...",
  "...oSssssssSo...",
  "....oSssssSo....",
]);

// Hair. Row 4 is the fringe; rows 5 and down are the sides.

const SHORT_TOP = [
  "....oooooooo....", // 1
  "...ohhhhhhhho...", // 2
  "..ohhhHHhhhhho..", // 3
  "..ohhhhhhhhhho..", // 4
];
const SIDE = "..oh........ho..";

const hair = (id: string, name: string, grid: PixelGrid): AvatarPart => ({ id, slot: "hair", name, free: true, grid });

const HAIR: AvatarPart[] = [
  hair("hair_short", "Short", rows(1, [...SHORT_TOP, SIDE])),
  hair(
    "hair_buzz",
    "Buzz",
    rows(2, [
      "....oooooooo....",
      "...ohhhhhhhho...",
      "...ohhHhhhhho...",
    ]),
  ),
  hair(
    "hair_bob",
    "Bob",
    rows(1, [...SHORT_TOP, SIDE, SIDE, SIDE, SIDE, "..ohh......hho..", "...oo......oo..."]),
  ),
  hair(
    "hair_long",
    "Long",
    rows(1, [
      ...SHORT_TOP,
      SIDE, SIDE, SIDE, SIDE, SIDE, SIDE,
      "..ohh......hho..",
      "..ohh......hho..",
      "...oo......oo...",
    ]),
  ),
  hair(
    "hair_curly",
    "Curly",
    rows(0, [
      "....oooooooo....",
      "..oohhhhhhhhoo..",
      ".ohhhHhhhhHhhho.",
      ".ohhhhhhhhhhhho.",
      ".ohhhhhhhhhhhho.",
      ".ohh........hho.",
      ".ohh........hho.",
      "..oo........oo..",
    ]),
  ),
  hair(
    "hair_bun",
    "Top bun",
    rows(0, [
      "......oooo......",
      "....ooHhhhoo....",
      "...ohhhhhhhho...",
      "..ohhhHHhhhhho..",
      "..ohhhhhhhhhho..",
      SIDE,
    ]),
  ),
  hair(
    "hair_pony",
    "Ponytail",
    rows(1, [
      ...SHORT_TOP,
      "..oh........hho.",
      "............ohho",
      "............ohho",
      ".............oo.",
    ]),
  ),
  hair(
    "hair_spiky",
    "Spiky",
    rows(0, [
      "....o..oo..o....",
      "...ohoohhooho...",
      "..ohhhhhhhhhho..",
      "..ohhhHHhhhhho..",
      "..ohh.hhh.hhho..",
      SIDE,
    ]),
  ),
];

// Outfits. Rows 11 to 15; "s" shows skin at the neckline.

const outfit = (id: string, name: string, grid: PixelGrid): AvatarPart => ({ id, slot: "outfit", name, free: true, grid });

const OUTFITS: AvatarPart[] = [
  outfit(
    "outfit_tee",
    "T-shirt",
    rows(12, [
      "...occsssscco...",
      "..occccsscccco..",
      ".occcccccccccco.",
      ".oCccccccccccCo.",
    ]),
  ),
  outfit(
    "outfit_hoodie",
    "Hoodie",
    rows(11, [
      "...oc......co...",
      "..occcssssccco..",
      ".occcccssccccco.",
      ".occcccwccwccco.",
      ".oCccccwccwccCo.",
    ]),
  ),
  outfit(
    "outfit_overalls",
    "Overalls",
    rows(12, [
      "...owwsssswwo...",
      "..owcwwsswwcwo..",
      ".owwccccccccwwo.",
      ".owwcCccccCcwwo.",
    ]),
  ),
  outfit(
    "outfit_sweater",
    "Roll-neck",
    rows(11, [
      ".....occcco.....",
      "...occcCCccco...",
      "..occcccccccco..",
      ".occcccccccccco.",
      ".oCccccccccccCo.",
    ]),
  ),
  outfit(
    "outfit_tank",
    "Vest top",
    rows(12, [
      "...osscsscsso...",
      "..osssccccssso..",
      ".ossccccccccsso.",
      ".ossccccccccsso.",
    ]),
  ),
  outfit(
    "outfit_jacket",
    "Jacket",
    rows(12, [
      "...occwsswcco...",
      "..occcCwwCccco..",
      ".occccCwwCcccco.",
      ".occccCwwCcccco.",
    ]),
  ),
];

// Faces: eyes on rows 6 and 7, mouth on rows 8 and 9.

const eyes = (id: string, name: string, grid: PixelGrid): AvatarPart => ({ id, slot: "eyes", name, free: true, grid });

const EYES: AvatarPart[] = [
  eyes("eyes_bright", "Bright", rows(6, [".....we..we.....", ".....ee..ee.....", BLANK, ".......mm......."])),
  eyes("eyes_happy", "Happy", rows(6, [".....ee..ee.....", BLANK, "......m..m......", ".......mm......."])),
  eyes("eyes_sleepy", "Sleepy", rows(6, [".....SS..SS.....", ".....ee..ee.....", BLANK, ".......m........"])),
  eyes("eyes_wink", "Wink", rows(6, [".....we.........", ".....ee..ee.....", BLANK, ".......mm......."])),
  eyes("eyes_wide", "Wide", rows(5, [".....ee..ee.....", ".....we..we.....", ".....ee..ee.....", BLANK, "......mmm......."])),
];

// Extras. Each brings its own colours.

const ACCESSORIES: AvatarPart[] = [
  { id: "acc_none", slot: "accessory", name: "None", free: true, grid: rows(0, []) },
  {
    id: "acc_glasses",
    slot: "accessory",
    name: "Glasses",
    free: true,
    grid: rows(5, [
      "....aaaaaaaa....",
      "...aa..aa..aa...",
      "....a..aa..a....",
      "....aaa..aaa....",
    ]),
    // Gold rims: dark ones swallow the eyes at this size.
    colors: { a: "#f2b84b", A: "#c98f2c" },
  },
  {
    id: "acc_headband",
    slot: "accessory",
    name: "Headband",
    free: true,
    grid: rows(3, ["..aAaaaaaaaaAa.."]),
    colors: { a: "#ff4d6d", A: "#c9304e" },
  },
  {
    id: "acc_scarf",
    slot: "accessory",
    name: "Scarf",
    free: true,
    grid: rows(11, [
      "....oaaaaaao....",
      "...oaAaaaaAao...",
      ".......oaAo.....",
      ".......oaao.....",
    ]),
    colors: { a: "#3fa7a0", A: "#2c7d78" },
  },
];

// Colours.

const color = (slot: AvatarSlot, id: string, name: string, colors: Record<string, string>): AvatarPart => ({
  id, slot, name, free: true, colors,
});

const SKINS: AvatarPart[] = [
  color("skin", "skin_1", "Porcelain", { s: "#fde0c8", S: "#ecc0a0" }),
  color("skin", "skin_2", "Sand", { s: "#f3c9a0", S: "#dba77a" }),
  color("skin", "skin_3", "Honey", { s: "#e3a06f", S: "#c47f55" }),
  color("skin", "skin_4", "Amber", { s: "#c98652", S: "#a5683c" }),
  color("skin", "skin_5", "Chestnut", { s: "#9a6238", S: "#7a4a28" }),
  color("skin", "skin_6", "Cocoa", { s: "#6b432a", S: "#4f2f1c" }),
];

const HAIR_COLORS: AvatarPart[] = [
  color("hairColor", "hc_1", "Black", { h: "#2b2330", H: "#4a3d52" }),
  color("hairColor", "hc_2", "Dark brown", { h: "#4a2f24", H: "#6e4a38" }),
  color("hairColor", "hc_3", "Brown", { h: "#7a4f30", H: "#9c6a48" }),
  color("hairColor", "hc_4", "Auburn", { h: "#a5482e", H: "#c96a48" }),
  color("hairColor", "hc_5", "Blonde", { h: "#e8c46a", H: "#f5dd9a" }),
  color("hairColor", "hc_6", "Strawberry", { h: "#e89a6a", H: "#f5b98f" }),
  color("hairColor", "hc_7", "Grey", { h: "#9a9aa8", H: "#c0c0cc" }),
  color("hairColor", "hc_8", "White", { h: "#e8e4ee", H: "#ffffff" }),
  color("hairColor", "hc_9", "Pink", { h: "#ff7fb6", H: "#ffb0d2" }),
  color("hairColor", "hc_10", "Blue", { h: "#6aa8f0", H: "#a8d8ff" }),
];

const OUTFIT_COLORS: AvatarPart[] = [
  color("outfitColor", "oc_1", "Lilac", { c: "#b892f0", C: "#8a62cf" }),
  color("outfitColor", "oc_2", "Mint", { c: "#6ccf9a", C: "#3f9f6a" }),
  color("outfitColor", "oc_3", "Pink", { c: "#ff8fb8", C: "#e8559a" }),
  color("outfitColor", "oc_4", "Butter", { c: "#ffd966", C: "#f2b84b" }),
  color("outfitColor", "oc_5", "Sky", { c: "#6aa8f0", C: "#4a7fcf" }),
  color("outfitColor", "oc_6", "Tomato", { c: "#e8604a", C: "#c0402e" }),
  color("outfitColor", "oc_7", "Cream", { c: "#fff1d6", C: "#f3d39b" }),
  color("outfitColor", "oc_8", "Charcoal", { c: "#5a4f66", C: "#3b3344" }),
];

const BACKGROUNDS: AvatarPart[] = [
  color("bg", "bg_1", "Lilac", { b: "#cdb8ff" }),
  color("bg", "bg_2", "Mint", { b: "#a5f0c5" }),
  color("bg", "bg_3", "Pink", { b: "#ff9ecb" }),
  color("bg", "bg_4", "Butter", { b: "#ffe48a" }),
  color("bg", "bg_5", "Sky", { b: "#a8d8ff" }),
  color("bg", "bg_6", "Peach", { b: "#ffc9a3" }),
  color("bg", "bg_7", "Cream", { b: "#fff8ef" }),
  color("bg", "bg_8", "Dusk", { b: "#40297f" }),
];

/** Colours that are the same in every avatar. */
export const FIXED_COLORS: Readonly<Record<string, string>> = {
  o: "#2a1b3d", // outline
  w: "#ffffff",
  e: "#2a1b3d", // eyes
  m: "#b03a5b", // mouth
  // Used only if an accessory forgets to bring its own.
  a: "#f2b84b",
  A: "#c98f2c",
};

/** Every letter a part grid may use. */
export const AVATAR_KEYS = "sShHcCaAbeowm";

export const PARTS: readonly AvatarPart[] = [
  ...SKINS, ...HAIR, ...HAIR_COLORS, ...OUTFITS, ...OUTFIT_COLORS, ...EYES, ...ACCESSORIES, ...BACKGROUNDS,
];

const BY_ID = new Map(PARTS.map((p) => [p.id, p]));

export const partsFor = (slot: AvatarSlot) => PARTS.filter((p) => p.slot === slot);

/** The part with this id, if it exists and belongs in this slot. */
export function findPart(slot: AvatarSlot, id: unknown): AvatarPart | undefined {
  const part = typeof id === "string" ? BY_ID.get(id) : undefined;
  return part?.slot === slot ? part : undefined;
}

/** What a slot falls back to when its saved id is missing or unknown. */
export const SLOT_DEFAULT: Record<AvatarSlot, string> = {
  skin: "skin_3",
  hair: "hair_short",
  hairColor: "hc_2",
  outfit: "outfit_tee",
  outfitColor: "oc_1",
  eyes: "eyes_bright",
  accessory: "acc_none",
  bg: "bg_1",
};
