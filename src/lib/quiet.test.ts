import { describe, expect, it } from "vitest";
import { computeStats } from "./badges";
import { addDays, dayKey, dayKeyIn, daysAgo } from "./dates";
import { buildGarden } from "./farm";
import { QUIET_COPY, hasCheckInBefore, yesterdayChoice } from "./quiet";
import type { PoopLog } from "./types";
import { isRecentLogTime, isRecentQuietDay } from "./validation";

const NOW = new Date(2026, 9, 9, 15, 0); // Fri 9 Oct 2026, 3pm local

/** A healthy log at 9am, `ago` days before NOW. */
function log(ago: number): PoopLog {
  const d = daysAgo(ago, NOW);
  d.setHours(9);
  return { id: `log-${ago}`, stool_type: 4, category: "healthy", color: "brown", factors: [], logged_at: d.toISOString(), notes: null };
}
const quiet = (ago: number) => dayKey(daysAgo(ago, NOW));
const choiceFor = (logs: PoopLog[], quietDays: string[]) => {
  const garden = buildGarden(logs, quietDays, NOW);
  const started = hasCheckInBefore(logs.map((l) => dayKey(new Date(l.logged_at))), quietDays, dayKey(NOW));
  return yesterdayChoice(garden.plots, started);
};

describe("what to offer for yesterday", () => {
  it("offers Mark quiet when yesterday was missed", () => {
    expect(choiceFor([log(2), log(3)], [])).toEqual({ day: quiet(1), action: "mark" });
  });

  it("offers Undo when yesterday is a quiet day", () => {
    expect(choiceFor([log(2)], [quiet(1)])).toEqual({ day: quiet(1), action: "undo" });
  });

  it("offers nothing when yesterday has a log", () => {
    expect(choiceFor([log(1), log(2)], [])).toBeNull();
    // A log wins over a quiet day marked for the same day.
    expect(choiceFor([log(1)], [quiet(1)])).toBeNull();
  });

  it("doesn't ask a brand-new garden about a day before it existed", () => {
    expect(choiceFor([], [])).toBeNull();
    expect(choiceFor([log(0)], [])).toBeNull();
    expect(choiceFor([], [quiet(0)])).toBeNull();
  });

  it("only ever points at yesterday", () => {
    // Two and three days ago were missed too; neither is offered.
    const choice = choiceFor([log(4), log(5)], []);
    expect(choice?.day).toBe(quiet(1));
    expect(choice?.day).not.toBe(quiet(2));
  });

  it("needs the list to end on today", () => {
    const days = buildGarden([log(2)], [], NOW).plots;
    expect(yesterdayChoice(days.slice(0, -1), true)).toBeNull();
    expect(yesterdayChoice([], true)).toBeNull();
  });

  it("knows whether anything came before a day", () => {
    expect(hasCheckInBefore(["2026-10-08"], [], "2026-10-09")).toBe(true);
    expect(hasCheckInBefore([], ["2026-10-01"], "2026-10-09")).toBe(true);
    expect(hasCheckInBefore(["2026-10-09"], ["2026-10-09"], "2026-10-09")).toBe(false);
    expect(hasCheckInBefore([], [], "2026-10-09")).toBe(false);
  });
});

describe("streaks around a caught-up day", () => {
  it("a quiet day yesterday keeps the run going", () => {
    const before = buildGarden([log(0), log(2), log(3)], [], NOW).streak;
    const after = buildGarden([log(0), log(2), log(3)], [quiet(1)], NOW).streak;
    expect(before.current).toBe(1);
    expect(after.current).toBe(4);
  });

  it("a gap that isn't filled still breaks it", () => {
    // Two days ago was missed and can no longer be marked.
    const g = buildGarden([log(0), log(1), log(3), log(4)], [], NOW);
    expect(g.streak.current).toBe(2);
    expect(g.streak.best).toBe(2);
  });

  it("logging on a quiet day counts the day once, as a log", () => {
    const g = buildGarden([log(0), log(1), log(2)], [quiet(1)], NOW);
    expect(g.streak.current).toBe(3);
    expect(g.plots.at(-2)?.status).toBe("movement");
    expect(g.plots.at(-2)?.crop).not.toBe("quiet");
  });

  it("a quiet day and a missed day look different in the garden", () => {
    const plots = buildGarden([log(3)], [quiet(1)], NOW).plots;
    expect(plots.at(-2)).toMatchObject({ status: "quiet", crop: "quiet" });
    expect(plots.at(-3)).toMatchObject({ status: "missed", crop: "empty" });
  });

  it("puts a quiet day on the right local day either side of midnight, in two timezones", () => {
    // 23:30 on 8 Oct in New York is already 9 Oct in Tokyo.
    const now = new Date("2026-10-09T03:30:00Z");
    expect(dayKeyIn(now, "America/New_York")).toBe("2026-10-08");
    expect(dayKeyIn(now, "Asia/Tokyo")).toBe("2026-10-09");

    // Logs on the 6th and today's local day; the 7th in New York (8th in Tokyo) was quiet.
    const ny = computeStats(["2026-10-06T16:00:00Z", "2026-10-08T16:00:00Z"], ["2026-10-07"], now, "America/New_York");
    expect(ny.currentStreak).toBe(3);
    const tokyo = computeStats(["2026-10-07T03:00:00Z", "2026-10-09T01:00:00Z"], ["2026-10-08"], now, "Asia/Tokyo");
    expect(tokyo.currentStreak).toBe(3);
    // The same quiet day one day off leaves a hole.
    const hole = computeStats(["2026-10-07T03:00:00Z", "2026-10-09T01:00:00Z"], ["2026-10-06"], now, "Asia/Tokyo");
    expect(hole.currentStreak).toBe(1);
  });

  it("keeps a run through the day the clocks change", () => {
    // US clocks go back on 1 Nov 2026 (a 25-hour day), marked quiet here.
    const s = computeStats(
      ["2026-10-31T17:00:00Z", "2026-11-02T17:00:00Z"],
      ["2026-11-01"],
      new Date("2026-11-02T22:00:00Z"),
      "America/New_York",
    );
    expect(s.currentStreak).toBe(3);
    expect(s.quietDaysUsed).toBe(1);
  });
});

describe("how far back the server accepts", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

  it("takes a log from today or yesterday", () => {
    expect(isRecentLogTime(hoursAgo(0), now)).toBe(true);
    expect(isRecentLogTime(hoursAgo(30), now)).toBe(true);
    expect(isRecentLogTime(hoursAgo(49), now)).toBe(true);
  });

  it("refuses a log from two or more days ago, or from the future", () => {
    expect(isRecentLogTime(hoursAgo(51), now)).toBe(false);
    expect(isRecentLogTime(hoursAgo(24 * 3), now)).toBe(false);
    expect(isRecentLogTime(hoursAgo(24 * 200), now)).toBe(false);
    expect(isRecentLogTime(hoursAgo(-1), now)).toBe(false);
    expect(isRecentLogTime(hoursAgo(-0.05), now)).toBe(true); // a clock 3 minutes fast
    expect(isRecentLogTime("not a date", now)).toBe(false);
  });

  it("takes a quiet day for today or yesterday", () => {
    expect(isRecentQuietDay("2026-10-09", now)).toBe(true);
    expect(isRecentQuietDay("2026-10-08", now)).toBe(true);
  });

  it("allows one day of slack each way for timezones", () => {
    // Someone west of UTC whose yesterday is the 7th; someone east already on the 10th.
    expect(isRecentQuietDay("2026-10-07", now)).toBe(true);
    expect(isRecentQuietDay("2026-10-10", now)).toBe(true);
  });

  it("refuses anything older, further ahead, or not a real date", () => {
    expect(isRecentQuietDay("2026-10-06", now)).toBe(false);
    expect(isRecentQuietDay("2026-09-09", now)).toBe(false);
    expect(isRecentQuietDay("2025-10-09", now)).toBe(false);
    expect(isRecentQuietDay("2026-10-11", now)).toBe(false);
    expect(isRecentQuietDay("2026-02-31", new Date("2026-03-02T12:00:00Z"))).toBe(false);
    expect(isRecentQuietDay("09/10/2026", now)).toBe(false);
    expect(isRecentQuietDay("", now)).toBe(false);
  });

  it("always includes the user's own today and yesterday, wherever they are", () => {
    // Every hour of a day, in the furthest-apart timezones there are.
    for (let h = 0; h < 24; h++) {
      const at = new Date(Date.UTC(2026, 9, 9, h, 30));
      for (const tz of ["Pacific/Kiritimati", "Pacific/Pago_Pago", "UTC", "Asia/Kolkata"]) {
        const today = dayKeyIn(at, tz);
        expect(isRecentQuietDay(today, at), `${tz} today at ${h}h`).toBe(true);
        expect(isRecentQuietDay(addDays(today, -1), at), `${tz} yesterday at ${h}h`).toBe(true);
        // Local midnight at the start of yesterday is never more than 50 hours back.
        const [y, m, d] = addDays(today, -1).split("-").map(Number);
        const offsetMs = new Date(at.toLocaleString("en-US", { timeZone: tz })).getTime() - new Date(at.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
        const startOfYesterday = new Date(Date.UTC(y, m - 1, d) - offsetMs).toISOString();
        expect(isRecentLogTime(startOfYesterday, at), `${tz} start of yesterday at ${h}h`).toBe(true);
      }
    }
  });
});

describe("wording", () => {
  it("is plain and never promises anything about a streak", () => {
    for (const text of Object.values(QUIET_COPY)) {
      expect(text).not.toMatch(/streak|safe|saved|protect|rescue/i);
      expect(text.length).toBeLessThanOrEqual(60);
    }
    expect(QUIET_COPY.marked).toBe("Marked as a quiet day.");
  });
});
