// Gentle ideas for when you haven't gone yet. Everyday habits, not medical
// advice. They rotate daily so the card doesn't get stale.
import type { PixelGrid } from "@/components/ui/PixelArt";
import { FACTORS } from "./factors";

export interface Suggestion {
  title: string;
  detail: string;
  icon: PixelGrid;
}

const MUG: PixelGrid = ["..w.w..", "...w...", "ooooo..", "obbbooo", "obBboo.", "obbbo..", ".ooo..."];
const CLOCK: PixelGrid = [".ooooo.", "oyyyyyo", "oyyoyyo", "oyyooyo", "oyyyyyo", "oyyyyyo", ".ooooo."];
const PEAR: PixelGrid = ["...g...", "...o...", "..ogo..", ".oggGo.", "ogggGGo", "oggGGGo", ".ooooo."];

const ALL: Suggestion[] = [
  { title: "Big glass of water", detail: "Room-temp or warm works best.", icon: FACTORS.hydrated.icon },
  { title: "A fiber snack", detail: "Pear, kiwi, prunes, oats or berries.", icon: PEAR },
  { title: "10-minute walk", detail: "Moving your body wakes up your gut.", icon: FACTORS.movement.icon },
  { title: "Something warm", detail: "Tea, coffee or warm water with lemon.", icon: MUG },
  { title: "Give it time", detail: "Sit for a few calm minutes after a meal.", icon: CLOCK },
  { title: "Veggies at dinner", detail: "Leafy greens and beans help things along.", icon: FACTORS.fiber.icon },
];

/** Three suggestions for today (stable within a day). */
export function suggestionsFor(now: Date): Suggestion[] {
  const start = now.getDate() % ALL.length;
  return [0, 1, 2].map((i) => ALL[(start + i) % ALL.length]);
}

/** After this many days without a movement, Mia mentions getting advice. */
export const CHECK_IN_AFTER_DAYS = 3;
