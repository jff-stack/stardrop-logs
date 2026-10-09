// The Bristol Stool Scale with farm names, descriptions and pixel icons.
// 1-2 are "a bit dry", 3-4 are the goal, 5-7 are "a bit rainy".
import type { PixelGrid } from "@/components/ui/PixelArt";
import type { StoolCategory, StoolType } from "./types";

export interface BristolInfo {
  type: StoolType;
  /** Cute farm name shown everywhere. */
  name: string;
  /** Plain description so users can pick confidently. */
  description: string;
  category: StoolCategory;
  /** 12×7 pixel icon (palette: PALETTE in PixelArt; s/S = soil tones). */
  icon: PixelGrid;
}

export const CATEGORY_LABEL: Record<StoolCategory, string> = {
  dry: "A bit dry",
  healthy: "Prize harvest!",
  loose: "A bit rainy",
};

/** Accent colour per category (matches theme tokens). */
export const CATEGORY_COLOR: Record<StoolCategory, string> = {
  dry: "#ffc9a3",     // peach
  healthy: "#a5f0c5", // mint
  loose: "#a8d8ff",   // sky
};

export const BRISTOL: Record<StoolType, BristolInfo> = {
  1: {
    type: 1,
    name: "Dry Pebbles",
    description: "Separate hard lumps, like little stones",
    category: "dry",
    icon: [
      "............",
      "..oo....oo..",
      ".osso..osso.",
      ".oSSo..oSSo.",
      "..oo.oo.oo..",
      ".....oSo....",
      "......o.....",
    ],
  },
  2: {
    type: 2,
    name: "Clumpy Soil",
    description: "Lumpy and sausage-shaped",
    category: "dry",
    icon: [
      "............",
      "..oo.oo.oo..",
      ".ossossosso.",
      ".osSssSssSo.",
      "..oSSoSSSo..",
      "...oo.ooo...",
      "............",
    ],
  },
  3: {
    type: 3,
    name: "Perfect Log",
    description: "Sausage-shaped with a few cracks",
    category: "healthy",
    icon: [
      "............",
      "..oooooooo..",
      ".oswsksksso.",
      ".osssssssSo.",
      "..oSSSSSSo..",
      "...oooooo...",
      "............",
    ],
  },
  4: {
    type: 4,
    name: "Prize Crop",
    description: "Smooth and soft, like a snake",
    category: "healthy",
    icon: [
      "............",
      ".oooooooooo.",
      "oswssssssso.",
      "osssssssssSo",
      ".oSSSSSSSSo.",
      "..oooooooo..",
      "............",
    ],
  },
  5: {
    type: 5,
    name: "Soft Clumps",
    description: "Soft blobs with clear edges",
    category: "loose",
    icon: [
      "............",
      "..ooo..ooo..",
      ".osswoosswo.",
      ".oSsso.osSo.",
      "..ooo..ooo..",
      "....ooo.....",
      "...osSo.....",
    ],
  },
  6: {
    type: 6,
    name: "Loose Mud",
    description: "Fluffy, mushy pieces",
    category: "loose",
    icon: [
      "............",
      "...o.oo.o...",
      "..osossosso.",
      ".osssssssSo.",
      "oSsSssSssSSo",
      ".oo.oooo.oo.",
      "............",
    ],
  },
  7: {
    type: 7,
    name: "Rainy Soil",
    description: "Watery, no solid pieces",
    category: "loose",
    icon: [
      ".....b......",
      "....bBb.....",
      "....bbb..b..",
      ".........b..",
      "..oooooooo..",
      ".osbsbsbsSo.",
      "..oooooooo..",
    ],
  },
};

export const BRISTOL_LIST = Object.values(BRISTOL);

export const categoryOf = (type: StoolType): StoolCategory => BRISTOL[type].category;
