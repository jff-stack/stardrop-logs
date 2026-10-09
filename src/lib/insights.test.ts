import { describe, expect, it } from "vitest";
import { buildInsights } from "./insights";
import { daysAgo } from "./dates";
import { categoryOf } from "./bristol";
import type { Factor, PoopLog, StoolType } from "./types";

const NOW = new Date(2026, 9, 9, 15, 0);

function log(ago: number, type: StoolType, factors: Factor[] = []): PoopLog {
  const d = daysAgo(ago, NOW);
  d.setHours(9);
  return {
    id: `${ago}-${type}`,
    stool_type: type,
    category: categoryOf(type),
    color: "brown",
    factors,
    logged_at: d.toISOString(),
    notes: null,
  };
}

describe("insights", () => {
  it("is empty-safe", () => {
    const ins = buildInsights([], [], NOW);
    expect(ins.kpis.prizeRate30).toBeNull();
    expect(ins.weekly).toHaveLength(8);
    expect(ins.weekly.every((w) => w.rate === null)).toBe(true);
    expect(ins.factorImpact).toEqual([]);
  });

  it("computes prize rate and its change month over month", () => {
    const logs = [log(1, 4), log(2, 4), log(3, 4), log(4, 1), log(40, 1), log(41, 4)];
    const k = buildInsights(logs, [], NOW).kpis;
    expect(k.prizeRate30).toBe(75);
    expect(k.prizeDelta).toBe(25);
  });

  it("puts this week last", () => {
    const weekly = buildInsights([log(0, 4), log(1, 6)], [], NOW).weekly;
    expect(weekly.at(-1)).toMatchObject({ label: "Now", rate: 50, logs: 2 });
  });

  it("spots a factor that helps", () => {
    const logs = [
      ...[1, 2, 3, 4].map((d) => log(d, 4, ["hydrated"])),
      ...[5, 6, 7, 8].map((d) => log(d, 1)),
    ];
    const top = buildInsights(logs, [], NOW).factorImpact[0];
    expect(top).toMatchObject({ factor: "hydrated", withRate: 100, withoutRate: 0 });
  });
});
