// Entry point for pattern models. Swap the return value here when a trained
// model is ready; callers only ever see the PatternModel interface.
// See docs/MODEL.md for the plan (and the privacy rules it has to follow).
import { baselineModel } from "./baseline";
import type { PatternModel } from "./types";

export function getPatternModel(): PatternModel {
  return baselineModel;
}

export { dailyFeatures } from "./features";
export type { DayFeatures, PatternGuess, PatternModel, Confidence } from "./types";
