import { describe, expect, it } from "vitest";
import { BADGES, BADGE_GROUPS, badgeLabel, computeStats, progressText } from "./badges";
import { BADGE_ART, LOCKED_PALETTE, LOCK_ART } from "./badge-art";
import { PALETTE } from "@/components/ui/PixelArt";
import { addDays, dayKey, dayKeyIn, daysAgo } from "./dates";
import { buildGarden } from "./farm";
import { MILESTONES } from "./streak";
import type { PoopLog } from "./types";

const UTC = "UTC";
const NOW = new Date("2026-10-09T15:00:00Z");
const TODAY = "2026-10-09";

/** A log at noon UTC, `ago` days before TODAY. */
const at = (ago: number, hour = 12) => `${addDays(TODAY, -ago)}T${String(hour).padStart(2, "0")}:00:00Z`;
const quiet = (ago: number) => addDays(TODAY, -ago);
const run = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, i) => at(to + i));
const stats = (logs: string[], quietDays: string[] = [], now = NOW, tz = UTC) => computeStats(logs, quietDays, now, tz);
const badge = (id: string) => BADGES.find((b) => b.id === id)!;

describe("streaks", () => {
  it("tells a 2-day streak from a 3-day one", () => {
    expect(stats([at(0), at(1)]).currentStreak).toBe(2);
    expect(stats([at(0), at(1), at(2)]).currentStreak).toBe(3);
    expect(badge("streak-3").earned(stats([at(0), at(1)]))).toBe(false);
    expect(badge("streak-3").earned(stats([at(0), at(1), at(2)]))).toBe(true);
  });

  it("starts over after a gap and remembers the longest", () => {
    const s = stats([at(0), at(1), at(3), at(4), at(5), at(6)]);
    expect(s.currentStreak).toBe(2);
    expect(s.longestStreak).toBe(4);
  });

  it("doesn't break just because today isn't logged yet", () => {
    expect(stats([at(1), at(2), at(3)]).currentStreak).toBe(3);
  });

  it("counts a quiet day exactly like a log", () => {
    const s = stats([at(0), at(2)], [quiet(1)]);
    expect(s.currentStreak).toBe(3);
    expect(s.daysCheckedIn).toBe(3);
    expect(s.quietDaysUsed).toBe(1);
    // A streak made only of quiet days is still a streak.
    expect(stats([], [quiet(0), quiet(1), quiet(2)]).longestStreak).toBe(3);
  });

  it("lets a log replace a quiet day on the same day", () => {
    const s = stats([at(0)], [quiet(0)]);
    expect(s.quietDaysUsed).toBe(0);
    expect(s.daysCheckedIn).toBe(1);
  });

  it("counts several logs on one day once", () => {
    const s = stats([at(0, 7), at(0, 12), at(0, 20), at(1, 9), at(1, 10)]);
    expect(s.currentStreak).toBe(2);
    expect(s.daysLogged).toBe(2);
    expect(s.totalLogs).toBe(5);
  });

  it("agrees with the garden's streak", () => {
    // The garden works in the machine's own timezone, so use that here too.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date(2026, 9, 9, 15, 0);
    const local = (ago: number) => {
      const d = daysAgo(ago, now);
      d.setHours(9);
      return d.toISOString();
    };
    const cases: { logs: number[]; quiet: number[] }[] = [
      { logs: [1, 2, 3], quiet: [] },
      { logs: [0, 2], quiet: [1] },
      { logs: [0, 1, 3, 4, 5, 6], quiet: [] },
      { logs: [0], quiet: [0] },
      { logs: [5, 6, 7, 20, 21], quiet: [4, 19, 40] },
      { logs: [], quiet: [] },
    ];
    for (const c of cases) {
      const times = c.logs.map(local);
      const quietDays = c.quiet.map((ago) => dayKey(daysAgo(ago, now)));
      const logs = times.map((t, i) => ({ id: String(i), logged_at: t, category: "healthy" }) as PoopLog);
      const garden = buildGarden(logs, quietDays, now).streak;
      const s = computeStats(times, quietDays, now, tz);
      expect({ current: s.currentStreak, best: s.longestStreak }).toEqual(garden);
    }
  });
});

describe("timezones", () => {
  it("puts a log near midnight on the right day for each zone", () => {
    // 03:59 UTC on Oct 9 is 23:59 on Oct 8 in New York and 12:59 on Oct 9 in Tokyo.
    const t = new Date("2026-10-09T03:59:00Z");
    expect(dayKeyIn(t, "America/New_York")).toBe("2026-10-08");
    expect(dayKeyIn(t, "Asia/Tokyo")).toBe("2026-10-09");

    // 23:59 one day and 00:01 the next (New York) are two days, not one.
    const logs = ["2026-10-09T03:59:00Z", "2026-10-09T04:01:00Z"];
    const now = new Date("2026-10-09T20:00:00Z");
    expect(computeStats(logs, [], now, "America/New_York").currentStreak).toBe(2);
    // In Tokyo both land on Oct 9.
    expect(computeStats(logs, [], now, "Asia/Tokyo").daysLogged).toBe(1);
  });

  it("keeps a streak through the clocks going forward", () => {
    // US clocks jump on 8 Mar 2026 (a 23-hour day).
    const logs = ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"].map((d) => `${d}T17:00:00Z`);
    const s = computeStats(logs, [], new Date("2026-03-10T22:00:00Z"), "America/New_York");
    expect(s.currentStreak).toBe(5);
    expect(s.streakDays).toEqual(["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"]);
  });

  it("keeps a streak through the clocks going back", () => {
    // US clocks fall back on 1 Nov 2026 (a 25-hour day).
    const logs = ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"].map((d) => `${d}T17:00:00Z`);
    const s = computeStats(logs, [], new Date("2026-11-02T22:00:00Z"), "America/New_York");
    expect(s.currentStreak).toBe(4);
    // Late evening on the long day is still that day.
    expect(dayKeyIn(new Date("2026-11-02T04:30:00Z"), "America/New_York")).toBe("2026-11-01");
  });

  it("steps through calendar days without skipping or repeating", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
});

describe("totals", () => {
  it("is all zeros with no history", () => {
    const s = stats([]);
    expect(s).toMatchObject({ currentStreak: 0, longestStreak: 0, totalLogs: 0, daysLogged: 0, daysCheckedIn: 0 });
    expect(BADGES.some((b) => b.earned(s))).toBe(false);
    expect(BADGES.every((b) => b.earnedOn(s) === null)).toBe(true);
  });

  it("handles more than 1000 logs", () => {
    // 400 days, three logs a day.
    const logs = Array.from({ length: 400 }, (_, i) => [at(i, 7), at(i, 12), at(i, 19)]).flat();
    const s = stats(logs);
    expect(s.totalLogs).toBe(1200);
    expect(s.daysLogged).toBe(400);
    expect(s.currentStreak).toBe(400);
    expect(BADGES.every((b) => b.id === "first-quiet-day" || b.earned(s))).toBe(true);
  });

  it("earns the year badge at 365 days, not 364", () => {
    expect(badge("streak-365").earned(stats(run(363, 0)))).toBe(false);
    expect(stats(run(363, 0)).longestStreak).toBe(364);
    expect(badge("streak-365").earned(stats(run(364, 0)))).toBe(true);
  });

  it("counts the last 30 days and the best 30 ever", () => {
    // 20 days in a row long ago, then nothing lately.
    const s = stats(run(99, 80));
    expect(s.bestDaysIn30).toBe(20);
    expect(s.daysLoggedLast30).toBe(0);
    // Earned back then, and still earned now.
    expect(badge("twenty-of-thirty").earned(s)).toBe(true);
    expect(badge("twenty-of-thirty").earnedOn(s)).toBe(addDays(TODAY, -80));
  });

  it("counts quiet days toward 20 of 30", () => {
    const s = stats(run(9, 0), Array.from({ length: 10 }, (_, i) => quiet(10 + i)));
    expect(s.daysLoggedLast30).toBe(20);
    expect(badge("twenty-of-thirty").earned(s)).toBe(true);
  });

  it("ignores a log dated after today", () => {
    expect(stats([at(-1)]).totalLogs).toBe(0);
  });
});

describe("earned dates", () => {
  it("dates a streak badge to the day the streak first got there", () => {
    // 3 in a row ending 10 days ago, then a longer run now.
    const s = stats([...run(12, 10), ...run(4, 0)]);
    expect(badge("streak-3").earnedOn(s)).toBe(addDays(TODAY, -10));
    expect(badge("streak-7").earnedOn(s)).toBeNull();
  });

  it("dates total-log badges to the day of that log", () => {
    const s = stats(run(9, 0));
    expect(badge("first-log").earnedOn(s)).toBe(addDays(TODAY, -9));
    expect(badge("poopybutt").earnedOn(s)).toBe(addDays(TODAY, -5));
    expect(badge("logs-10").earnedOn(s)).toBe(TODAY);
  });

  it("dates the quiet-day and week badges", () => {
    const s = stats(run(5, 0), [quiet(8)]);
    expect(badge("first-quiet-day").earnedOn(s)).toBe(addDays(TODAY, -8));
    expect(badge("full-week").earnedOn(s)).toBe(TODAY);
  });
});

describe("catalogue", () => {
  it("has a streak badge for every milestone", () => {
    expect(MILESTONES.map((m) => m.days)).toEqual([3, 7, 14, 30, 60, 100, 200, 365]);
    for (const m of MILESTONES) expect(badge(`streak-${m.days}`).name).toBe(m.name);
  });

  it("has the goofy ones at 5, 22 and 69 logs", () => {
    expect(badge("poopybutt").progress(stats([])).target).toBe(5);
    expect(badge("number-two").progress(stats([])).target).toBe(22);
    expect(badge("poopmaster69").progress(stats([])).target).toBe(69);
  });

  it("uses unique ids, known groups and real art", () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    for (const b of BADGES) {
      expect(BADGE_GROUPS).toContain(b.group);
      expect(BADGE_ART[b.artKey]).toBeDefined();
    }
  });

  it("never words a badge as a failure", () => {
    for (const b of BADGES) {
      expect(`${b.name} ${b.description}`).not.toMatch(/fail|missed|lost|lose|broke|behind|only|should|must/i);
    }
  });

  it("shows progress that never runs past the target", () => {
    const s = stats(run(500, 0));
    for (const b of BADGES) {
      const { current, target } = b.progress(s);
      expect(current).toBeLessThanOrEqual(target);
    }
  });

  it("shows the running streak on a locked streak badge", () => {
    // Longest was 6, but only 2 are running now.
    const s = stats([...run(20, 15), at(1), at(0)]);
    expect(progressText(badge("streak-7"), s)).toBe("2 of 7 days");
  });

  it("says the state in words", () => {
    const s = stats([at(0), at(1), at(2)]);
    expect(badgeLabel(badge("streak-3"), s, "en-GB")).toBe("Sprout, earned on 9 Oct 2026");
    expect(badgeLabel(badge("streak-7"), s, "en-GB")).toBe("Pumpkin Patch, locked, 3 of 7 days");
    expect(badgeLabel(badge("first-quiet-day"), s, "en-GB")).toBe("Moonlit Rest, locked, 0 of 1 quiet days");
  });
});

describe("art", () => {
  it("is 16x16 and only uses the shared palette", () => {
    for (const [name, grid] of Object.entries(BADGE_ART)) {
      expect(grid, name).toHaveLength(16);
      for (const row of grid) {
        expect(row, name).toHaveLength(16);
        for (const ch of row) if (ch !== ".") expect(PALETTE[ch], `${name}: ${ch}`).toBeDefined();
      }
    }
  });

  it("has a dim version of every colour for locked badges", () => {
    expect(Object.keys(LOCKED_PALETTE).sort()).toEqual(Object.keys(PALETTE).sort());
    expect(new Set(Object.values(LOCKED_PALETTE)).size).toBe(2);
    expect(LOCK_ART.every((row) => row.length === LOCK_ART[0].length)).toBe(true);
  });
});
