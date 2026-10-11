import { describe, expect, it } from "vitest";
import {
  buildMonth, compareMonths, countByDay, dayHeading, dayLabel, daysInMonth, isOpenable, monthKey, monthLabel, monthOf,
  monthRange, nextOpenable, shiftMonth,
} from "./calendar";
import { dayKeyIn } from "./dates";

const none = new Map<string, number>();
const noQuiet = new Set<string>();
const month = (y: number, m: number, counts = none, quiet = noQuiet, today = "2099-01-01") => buildMonth(y, m, counts, quiet, today);
const inMonthDays = (rows: ReturnType<typeof buildMonth>) => rows.flat().filter((c) => c.inMonth).map((c) => c.day);

describe("buildMonth", () => {
  it("is always 7 days wide, starting on Sunday", () => {
    for (let m = 0; m < 12; m++) {
      const rows = month(2026, m);
      expect(rows.length === 5 || rows.length === 6).toBe(true);
      for (const row of rows) {
        expect(row).toHaveLength(7);
        expect(new Date(`${row[0].dayKey}T00:00:00Z`).getUTCDay()).toBe(0);
      }
    }
  });

  it("starts a month that begins on a Sunday in the first cell", () => {
    // 1 Nov 2026 is a Sunday.
    const rows = month(2026, 10);
    expect(rows[0][0]).toMatchObject({ dayKey: "2026-11-01", inMonth: true, day: 1 });
    expect(rows).toHaveLength(5);
  });

  it("starts a month that begins on a Saturday in the last cell of the first row", () => {
    // 1 Aug 2026 is a Saturday.
    const rows = month(2026, 7);
    expect(rows[0][6]).toMatchObject({ dayKey: "2026-08-01", inMonth: true });
    expect(rows[0][5]).toMatchObject({ dayKey: "2026-07-31", inMonth: false });
    expect(rows).toHaveLength(6);
  });

  it("gives February 28 days, or 29 in a leap year", () => {
    expect(inMonthDays(month(2026, 1))).toHaveLength(28);
    expect(inMonthDays(month(2028, 1))).toHaveLength(29);
    expect(daysInMonth(2100, 1)).toBe(28); // not a leap year
    // Feb 2026 fits 4 weeks exactly; a fifth row keeps the card the same height.
    expect(month(2026, 1)).toHaveLength(5);
    expect(month(2026, 1)[4].every((c) => !c.inMonth)).toBe(true);
  });

  it("uses six rows when the month spills over", () => {
    // May 2026 starts on a Friday and has 31 days.
    expect(month(2026, 4)).toHaveLength(6);
  });

  it("has every day exactly once in months where the clocks change", () => {
    // America/Toronto: forward on 8 Mar 2026, back on 1 Nov 2026.
    expect(inMonthDays(month(2026, 2))).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(inMonthDays(month(2026, 10))).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    const keys = month(2026, 2).flat().map((c) => c.dayKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("2026-03-08");
    expect(keys).toContain("2026-03-09");
  });

  it("marks today, and dims days after it", () => {
    const rows = month(2026, 9, none, noQuiet, "2026-10-09");
    const cell = (key: string) => rows.flat().find((c) => c.dayKey === key)!;
    expect(cell("2026-10-09")).toMatchObject({ isToday: true, isFuture: false });
    expect(cell("2026-10-08")).toMatchObject({ isToday: false, isFuture: false });
    expect(cell("2026-10-10")).toMatchObject({ isToday: false, isFuture: true });
    expect(rows.flat().filter((c) => c.isToday)).toHaveLength(1);
  });

  it("carries counts of 0, 1 and many", () => {
    const counts = new Map([["2026-10-05", 1], ["2026-10-06", 14]]);
    const rows = month(2026, 9, counts, noQuiet, "2026-10-09");
    const cell = (key: string) => rows.flat().find((c) => c.dayKey === key)!;
    expect(cell("2026-10-04").count).toBe(0);
    expect(cell("2026-10-05").count).toBe(1);
    expect(cell("2026-10-06").count).toBe(14);
  });

  it("shows a quiet day only when the day has no logs", () => {
    const counts = new Map([["2026-10-06", 2]]);
    const quiet = new Set(["2026-10-05", "2026-10-06"]);
    const rows = month(2026, 9, counts, quiet, "2026-10-09");
    const cell = (key: string) => rows.flat().find((c) => c.dayKey === key)!;
    expect(cell("2026-10-05")).toMatchObject({ count: 0, hasQuiet: true });
    expect(cell("2026-10-06")).toMatchObject({ count: 2, hasQuiet: false });
  });

  it("only lets you open days of this month that have something on them", () => {
    const counts = new Map([["2026-10-05", 1], ["2026-09-30", 3], ["2026-10-20", 1]]);
    const quiet = new Set(["2026-10-07"]);
    const rows = month(2026, 9, counts, quiet, "2026-10-09");
    const open = rows.flat().filter(isOpenable).map((c) => c.dayKey);
    // Not the empty days, not 30 Sep (shown faintly from last month), not the 20th (future).
    expect(open).toEqual(["2026-10-05", "2026-10-07"]);
  });
});

describe("moving around", () => {
  it("steps between months across a year end", () => {
    expect(shiftMonth({ year: 2026, monthIndex: 11 }, 1)).toEqual({ year: 2027, monthIndex: 0 });
    expect(shiftMonth({ year: 2026, monthIndex: 0 }, -1)).toEqual({ year: 2025, monthIndex: 11 });
    expect(shiftMonth({ year: 2026, monthIndex: 5 }, -18)).toEqual({ year: 2024, monthIndex: 11 });
    expect(compareMonths({ year: 2026, monthIndex: 9 }, { year: 2026, monthIndex: 9 })).toBe(0);
    expect(compareMonths({ year: 2025, monthIndex: 11 }, { year: 2026, monthIndex: 0 })).toBeLessThan(0);
    expect(monthOf("2026-10-09")).toEqual({ year: 2026, monthIndex: 9 });
    expect(monthKey({ year: 2026, monthIndex: 0 })).toBe("2026-01");
  });

  it("labels months and days", () => {
    expect(monthLabel({ year: 2026, monthIndex: 9 }, "en-US")).toBe("October 2026");
    expect(dayHeading("2026-10-09", "en-US")).toBe("Friday, Oct 9");
    const rows = month(2026, 9, new Map([["2026-10-09", 3], ["2026-10-08", 1]]), new Set(["2026-10-07"]), "2026-10-09");
    const cell = (key: string) => rows.flat().find((c) => c.dayKey === key)!;
    expect(dayLabel(cell("2026-10-09"), "en-US")).toBe("Oct 9, 3 logs");
    expect(dayLabel(cell("2026-10-08"), "en-US")).toBe("Oct 8, 1 log");
    expect(dayLabel(cell("2026-10-07"), "en-US")).toBe("Oct 7, quiet day");
    expect(dayLabel(cell("2026-10-06"), "en-US")).toBe("Oct 6, nothing logged");
  });

  it("moves arrow keys between days that can be opened", () => {
    const counts = new Map([["2026-10-05", 1], ["2026-10-07", 1], ["2026-10-19", 2], ["2026-10-21", 1]]);
    const rows = month(2026, 9, counts, noQuiet, "2026-10-31");
    expect(nextOpenable(rows, "2026-10-05", "ArrowRight")).toBe("2026-10-07"); // skips the empty 6th
    expect(nextOpenable(rows, "2026-10-07", "ArrowLeft")).toBe("2026-10-05");
    expect(nextOpenable(rows, "2026-10-05", "ArrowDown")).toBe("2026-10-19"); // same weekday, two weeks on
    expect(nextOpenable(rows, "2026-10-19", "ArrowUp")).toBe("2026-10-05");
    expect(nextOpenable(rows, "2026-10-05", "ArrowLeft")).toBeNull();
    expect(nextOpenable(rows, "2026-10-21", "ArrowDown")).toBeNull();
    expect(nextOpenable(rows, "2026-10-19", "Home")).toBe("2026-10-05");
    expect(nextOpenable(rows, "2026-10-05", "End")).toBe("2026-10-21");
    expect(nextOpenable(rows, "1999-01-01", "ArrowRight")).toBeNull();
  });
});

describe("what to ask the server for", () => {
  it("covers the whole local month with a day to spare each side", () => {
    const now = new Date("2026-10-09T12:00:00Z");
    const { from, to } = monthRange({ year: 2026, monthIndex: 5 }, "America/Toronto", now);
    // June in Toronto runs 1 Jun 04:00Z to 1 Jul 04:00Z.
    expect(from).toBe("2026-05-31T04:00:00.000Z");
    expect(to).toBe("2026-07-02T04:00:00.000Z");
    expect((Date.parse(to) - Date.parse(from)) / 86_400_000).toBeLessThanOrEqual(45);
  });

  it("never asks further ahead than tomorrow", () => {
    const now = new Date("2026-10-09T12:00:00Z");
    const { to } = monthRange({ year: 2026, monthIndex: 9 }, "America/Toronto", now);
    expect(to).toBe("2026-10-10T12:00:00.000Z");
  });

  it("stays within 45 days for the longest months, clock changes included", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    for (const tz of ["America/Toronto", "Pacific/Auckland", "UTC", "Asia/Kolkata"]) {
      for (let m = 0; m < 12; m++) {
        const { from, to } = monthRange({ year: 2026, monthIndex: m }, tz, now);
        expect((Date.parse(to) - Date.parse(from)) / 86_400_000).toBeLessThanOrEqual(34);
      }
    }
  });

  it("counts logs into days in the reader's timezone", () => {
    const times = ["2026-10-09T03:30:00Z", "2026-10-09T15:00:00Z", "2026-10-10T01:00:00Z"];
    const toronto = countByDay(times, (t) => dayKeyIn(new Date(t), "America/Toronto"));
    expect(Object.fromEntries(toronto)).toEqual({ "2026-10-08": 1, "2026-10-09": 2 });
    const auckland = countByDay(times, (t) => dayKeyIn(new Date(t), "Pacific/Auckland"));
    expect(Object.fromEntries(auckland)).toEqual({ "2026-10-09": 1, "2026-10-10": 2 });
  });
});
