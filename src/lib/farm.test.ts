import { describe, expect, it } from "vitest";
import { buildGarden } from "./farm";
import { dayKey, daysAgo } from "./dates";
import { categoryOf } from "./bristol";
import { milestoneProgress } from "./streak";
import type { PoopLog, StoolType } from "./types";

const NOW = new Date(2026, 9, 9, 15, 0); // Fri Oct 9 2026, 3pm local

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

const quiet = (ago: number) => dayKey(daysAgo(ago, NOW));

describe("check-in streak", () => {
  it("doesn't break just because today isn't logged yet", () => {
    const g = buildGarden([log(1, 4), log(2, 4), log(3, 4)], [], NOW);
    expect(g.streak.current).toBe(3);
    expect(g.loggedToday).toBe(false);
  });

  it("counts quiet days as check-ins", () => {
    const g = buildGarden([log(0, 4), log(2, 4)], [quiet(1)], NOW);
    expect(g.streak.current).toBe(3);
  });

  it("resets after a missed day and remembers the best run", () => {
    const logs = [log(0, 4), log(1, 4), log(3, 4), log(4, 4), log(5, 4), log(6, 4)];
    const g = buildGarden(logs, [], NOW);
    expect(g.streak.current).toBe(2);
    expect(g.streak.best).toBe(4);
  });

  it("a movement log wins over a quiet day on the same day", () => {
    const g = buildGarden([log(0, 4)], [quiet(0)], NOW);
    expect(g.quietToday).toBe(false);
    expect(g.loggedToday).toBe(true);
  });
});

describe("crops", () => {
  it("grows bigger crops with a longer prize streak", () => {
    const logs = Array.from({ length: 8 }, (_, i) => log(i, 4));
    const crops = buildGarden(logs, [], NOW).plots.slice(-8).map((p) => p.crop);
    expect(crops).toEqual(["parsnip", "parsnip", "pumpkin", "pumpkin", "pumpkin", "pumpkin", "stardrop", "stardrop"]);
  });

  it("shows thirsty / soggy sprouts for non-prize days", () => {
    const plots = buildGarden([log(1, 1), log(0, 6)], [], NOW).plots;
    expect(plots.at(-2)?.crop).toBe("thirsty");
    expect(plots.at(-1)?.crop).toBe("soggy");
  });

  it("plants a seed today and a moon on quiet days", () => {
    const plots = buildGarden([], [quiet(1)], NOW).plots;
    expect(plots.at(-1)?.crop).toBe("seed");
    expect(plots.at(-2)?.crop).toBe("quiet");
  });

  it("tracks days since the last movement", () => {
    expect(buildGarden([log(3, 4)], [], NOW).daysSinceMovement).toBe(3);
    expect(buildGarden([], [], NOW).daysSinceMovement).toBeNull();
  });
});

describe("milestones", () => {
  it("points at the next badge", () => {
    expect(milestoneProgress(0).next?.days).toBe(3);
    expect(milestoneProgress(5)).toMatchObject({ remaining: 2, done: 2, total: 4 });
    expect(milestoneProgress(5).earned?.name).toBe("Sprout");
    expect(milestoneProgress(100).next).toBeNull();
  });
});
