import { describe, expect, it } from "vitest";
import { dailyFeatures, getPatternModel } from "./index";
import { dayKey, daysAgo } from "@/lib/dates";
import { categoryOf } from "@/lib/bristol";
import type { PoopLog, StoolType } from "@/lib/types";

const NOW = new Date(2026, 9, 9, 20, 0);

function log(ago: number, type: StoolType, hour: number): PoopLog {
  const d = daysAgo(ago, NOW);
  d.setHours(hour);
  return {
    id: `${ago}-${hour}`,
    stool_type: type,
    category: categoryOf(type),
    color: "brown",
    factors: ["hydrated"],
    logged_at: d.toISOString(),
    notes: "private note",
  };
}

describe("dailyFeatures", () => {
  it("makes one record per day and never carries notes or ids", () => {
    const days = dailyFeatures([log(0, 4, 8), log(0, 4, 13)], [], NOW, 7);
    expect(days).toHaveLength(7);
    const today = days[6];
    expect(today.count).toBe(2);
    expect(today.firstHour).toBe(8);
    expect(today.factors).toEqual({ hydrated: true });
    expect(JSON.stringify(days)).not.toContain("private note");
    expect(JSON.stringify(days)).not.toContain('"id"');
  });

  it("marks quiet days", () => {
    const days = dailyFeatures([], [dayKey(daysAgo(1, NOW))], NOW, 3);
    expect(days[1].quiet).toBe(true);
  });
});

describe("baseline model", () => {
  it("has no confidence with no history", () => {
    const guess = getPatternModel().predict(dailyFeatures([], [], NOW, 30));
    expect(guess.confidence).toBe("none");
    expect(guess.perDay).toBeNull();
  });

  it("learns someone's usual rhythm", () => {
    const logs: PoopLog[] = [];
    for (let ago = 0; ago < 25; ago++) logs.push(log(ago, ago % 5 === 0 ? 2 : 4, 7 + (ago % 3)));
    const guess = getPatternModel().predict(dailyFeatures(logs, [], NOW, 30));
    expect(guess.perDay).toBe(1);
    expect(guess.usualHour).toBe(8);
    expect(guess.typicalType).toBe(4);
    expect(guess.healthyShare).toBeCloseTo(0.8, 5);
    expect(guess.confidence).toBe("high");
  });
});
