import { describe, expect, it } from "vitest";
import { averagePerDay, logsOn, todayRhythm } from "./rhythm";
import { daysAgo } from "./dates";
import { categoryOf } from "./bristol";
import type { PoopLog, StoolType } from "./types";

const NOW = new Date(2026, 9, 9, 20, 0);

function log(ago: number, type: StoolType, hour = 9): PoopLog {
  const d = daysAgo(ago, NOW);
  d.setHours(hour);
  return {
    id: `${ago}-${type}-${hour}`,
    stool_type: type,
    category: categoryOf(type),
    color: "brown",
    factors: [],
    logged_at: d.toISOString(),
    notes: null,
  };
}

describe("logsOn", () => {
  it("picks out every log from today, however many", () => {
    const logs = [log(0, 4, 8), log(0, 3, 13), log(0, 4, 19), log(1, 4)];
    expect(logsOn(logs, NOW)).toHaveLength(3);
  });
});

describe("todayRhythm", () => {
  it("is happy with one or a few healthy ones", () => {
    expect(todayRhythm([log(0, 4)]).level).toBe("great");
    expect(todayRhythm([log(0, 4), log(0, 3, 14)]).level).toBe("great");
    expect(todayRhythm([log(0, 4), log(0, 3, 12), log(0, 4, 18)]).level).toBe("great");
  });

  it("flags more than three a day", () => {
    const four = [8, 11, 14, 18].map((h) => log(0, 4, h));
    expect(todayRhythm(four).level).toBe("watch");
  });

  it("flags a couple of loose ones", () => {
    expect(todayRhythm([log(0, 6), log(0, 5, 14)]).level).toBe("watch");
  });

  it("suggests a check-in for lots of loose ones", () => {
    const rainy = [8, 12, 16].map((h) => log(0, 6, h));
    expect(todayRhythm(rainy).level).toBe("talk");
  });

  it("always sends red-flag colours to a doctor", () => {
    const red = { ...log(0, 4), color: "red" as const };
    const r = todayRhythm([red]);
    expect(r.level).toBe("talk");
    expect(r.title).toMatch(/doctor/);
  });

  it("calls dry-but-normal 'okay'", () => {
    expect(todayRhythm([log(0, 1)]).level).toBe("okay");
  });
});

describe("averagePerDay", () => {
  it("averages over the last 7 days", () => {
    const logs = [log(0, 4), log(0, 4, 15), log(2, 4), log(5, 4), log(10, 4)];
    expect(averagePerDay(logs, NOW)).toBeCloseTo(0.6, 5);
  });
});
