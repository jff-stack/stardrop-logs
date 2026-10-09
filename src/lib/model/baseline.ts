// The simple model: medians and averages over the days someone actually
// checked in. No training, no network, runs anywhere. It's the yardstick a
// future trained model has to beat.
import type { StoolType } from "@/lib/types";
import type { Confidence, DayFeatures, PatternGuess, PatternModel } from "./types";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function confidenceFor(checkedIn: number): Confidence {
  if (checkedIn === 0) return "none";
  if (checkedIn < 7) return "low";
  if (checkedIn < 21) return "medium";
  return "high";
}

export const baselineModel: PatternModel = {
  id: "baseline-v1",
  predict(days: DayFeatures[]): PatternGuess {
    // Only days with a log or a quiet day say anything; blank days might
    // just be days they forgot.
    const checkedIn = days.filter((d) => d.count > 0 || d.quiet);
    const withLogs = days.filter((d) => d.count > 0);

    const typeCounts = new Map<number, number>();
    for (const d of withLogs) {
      if (d.avgType === null) continue;
      const t = Math.round(d.avgType);
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
    const typical = [...typeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];

    const perDay = checkedIn.length
      ? Math.round((checkedIn.reduce((s, d) => s + d.count, 0) / checkedIn.length) * 10) / 10
      : null;
    const hour = median(withLogs.map((d) => d.firstHour).filter((h): h is number => h !== null));
    const healthyDays = withLogs.filter((d) => d.healthy > 0).length;

    return {
      perDay,
      usualHour: hour === null ? null : Math.round(hour),
      typicalType: typical ? (typical[0] as StoolType) : null,
      healthyShare: withLogs.length ? healthyDays / withLogs.length : null,
      confidence: confidenceFor(checkedIn.length),
    };
  },
};
