// What Mia says while you fill in a log. Short, kind, not medical advice.
import { COLORS } from "./colors";
import type { Factor, StoolColor, StoolType } from "./types";

export const LOG_INTRO = "Let's check the harvest! Pick the one that looks closest.";

const TYPE_TIPS: Record<StoolType, string> = {
  1: "Little pebbles usually mean things are a bit dry. Water and fiber are your friends!",
  2: "A bit clumpy. Some extra water today could really help.",
  3: "Ooh, a solid log! That's right in the healthy zone.",
  4: "A prize crop! This is exactly what we're aiming for.",
  5: "Soft clumps happen. Keep an eye on it and stay hydrated.",
  6: "A bit mushy. Gentle foods and plenty of fluids today!",
  7: "Rainy day! Sip water or an electrolyte drink, and rest up.",
};

const FACTOR_TIPS: Record<Factor, string> = {
  hydrated: "Hydrated! Your garden says thank you.",
  fiber: "Veggies! Fiber keeps everything moving nicely.",
  movement: "Moving your body helps your gut move too.",
  coffee: "Coffee can speed things up. Good to track!",
  stressed: "Stress really does reach the tummy. Be gentle with yourself.",
  poor_sleep: "Rough night? Sleep and digestion are close friends.",
  alcohol: "Noted! Alcohol can upset the balance for a day or two.",
  spicy: "Spicy food can make things a little rushed. Good to know!",
};

export const typeTip = (t: StoolType) => TYPE_TIPS[t];
export const factorTip = (f: Factor) => FACTOR_TIPS[f];

export function colorTip(c: StoolColor) {
  const info = COLORS[c];
  if (info.note) return info.note;
  return `${info.label}. That's a normal, healthy colour!`;
}
