// Things that might affect digestion, with little pixel icons. The keys match
// the whitelist in the poop_logs.factors CHECK constraint.
import type { PixelGrid } from "@/components/ui/PixelArt";
import type { Factor } from "./types";

export interface FactorInfo {
  key: Factor;
  label: string;
  /** Helps vs. hinders digestion, for Mia's tips and chip colours. */
  tone: "good" | "watch";
  icon: PixelGrid;
}

export const FACTORS: Record<Factor, FactorInfo> = {
  hydrated: {
    key: "hydrated",
    label: "Hydrated",
    tone: "good",
    icon: ["...o...", "..obo..", ".obbbo.", "obBbbbo", "obBbbbo", ".obbbo.", "..ooo.."],
  },
  fiber: {
    key: "fiber",
    label: "Veggies",
    tone: "good",
    icon: ["...gg..", "..ggG..", "...oo..", "..orro.", ".orrrRo", ".orrRRo", "..ooo.."],
  },
  movement: {
    key: "movement",
    label: "Moved",
    tone: "good",
    icon: ["..oo...", "..ooo..", "...o...", ".ooooo.", "...o...", "..o.o..", ".o...o."],
  },
  coffee: {
    key: "coffee",
    label: "Coffee",
    tone: "watch",
    icon: ["..w.w..", "...w...", "ooooo..", "occcooo", "osssoo.", "osssoo.", ".ooo..."],
  },
  stressed: {
    key: "stressed",
    label: "Stressed",
    tone: "watch",
    icon: [".o...o.", "o.o.o.o", ".......", "..ooo..", ".o...o.", "o.....o", "......."],
  },
  poor_sleep: {
    key: "poor_sleep",
    label: "Poor sleep",
    tone: "watch",
    icon: ["....ooo", "......o", ".ooo.o.", "...oooo", "..o....", ".ooo...", "......."],
  },
  alcohol: {
    key: "alcohol",
    label: "Alcohol",
    tone: "watch",
    icon: ["ooooooo", "ouuuuuo", ".ouuuo.", "..ouo..", "...o...", "...o...", "..ooo.."],
  },
  spicy: {
    key: "spicy",
    label: "Spicy",
    tone: "watch",
    icon: ["....gg.", "...gG..", "..orro.", ".orrRo.", "orrRo..", "orRo...", ".oo...."],
  },
};

export const FACTOR_LIST = Object.values(FACTORS);
