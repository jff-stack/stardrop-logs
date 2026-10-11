import { describe, expect, it } from "vitest";
import { isInCurrentWeek, startOfWeek, weekStartDay, weekdayOf, zonedMidnight } from "./week";

const TORONTO = "America/Toronto";
const AUCKLAND = "Pacific/Auckland";

describe("startOfWeek", () => {
  it("is the most recent Sunday at midnight, local time", () => {
    // Wed 7 Oct 2026, 15:00 in Toronto (UTC-4).
    const now = new Date("2026-10-07T19:00:00Z");
    expect(weekStartDay(now, TORONTO)).toBe("2026-10-04");
    expect(startOfWeek(now, TORONTO).toISOString()).toBe("2026-10-04T04:00:00.000Z");
  });

  it("on a Sunday, is that same day", () => {
    const now = new Date("2026-10-04T16:00:00Z"); // Sunday noon in Toronto
    expect(weekStartDay(now, TORONTO)).toBe("2026-10-04");
  });

  it("flips exactly at Sunday 00:00, not before", () => {
    // 23:59 Saturday 3 Oct in Toronto -> still last week.
    const before = new Date("2026-10-04T03:59:00Z");
    expect(weekStartDay(before, TORONTO)).toBe("2026-09-27");
    // 00:00 Sunday 4 Oct in Toronto -> new week.
    const after = new Date("2026-10-04T04:00:00Z");
    expect(weekStartDay(after, TORONTO)).toBe("2026-10-04");
    expect(startOfWeek(after, TORONTO).getTime()).toBe(after.getTime());
  });

  it("depends on where you are", () => {
    // The same instant is Saturday evening in Toronto and Sunday midday in Auckland.
    const now = new Date("2026-10-03T23:30:00Z");
    expect(weekStartDay(now, TORONTO)).toBe("2026-09-27");
    expect(weekStartDay(now, AUCKLAND)).toBe("2026-10-04");
    // Auckland is UTC+13 in October (summer time).
    expect(startOfWeek(now, AUCKLAND).toISOString()).toBe("2026-10-03T11:00:00.000Z");
  });

  it("is right in the week the clocks go forward", () => {
    // Toronto: clocks jump at 02:00 on Sunday 8 Mar 2026. Midnight that day is still UTC-5.
    const now = new Date("2026-03-11T17:00:00Z"); // Wed, now UTC-4
    expect(weekStartDay(now, TORONTO)).toBe("2026-03-08");
    expect(startOfWeek(now, TORONTO).toISOString()).toBe("2026-03-08T05:00:00.000Z");
    // Not what subtracting 3 x 24 hours from Wednesday's midnight would give.
    expect(startOfWeek(now, TORONTO).toISOString()).not.toBe("2026-03-08T04:00:00.000Z");
  });

  it("is right in the week the clocks go back", () => {
    // Toronto: clocks fall back at 02:00 on Sunday 1 Nov 2026. Midnight that day is still UTC-4.
    const now = new Date("2026-11-04T18:00:00Z"); // Wed, now UTC-5
    expect(weekStartDay(now, TORONTO)).toBe("2026-11-01");
    expect(startOfWeek(now, TORONTO).toISOString()).toBe("2026-11-01T04:00:00.000Z");
  });

  it("handles Auckland's clock changes too (the other way round)", () => {
    // Auckland springs forward on Sunday 27 Sep 2026 and falls back on Sunday 5 Apr 2026.
    expect(startOfWeek(new Date("2026-09-30T00:00:00Z"), AUCKLAND).toISOString()).toBe("2026-09-26T12:00:00.000Z");
    expect(startOfWeek(new Date("2026-04-08T00:00:00Z"), AUCKLAND).toISOString()).toBe("2026-04-04T11:00:00.000Z");
  });

  it("crosses a year boundary", () => {
    // Fri 1 Jan 2027: the week began on Sunday 27 Dec 2026.
    const now = new Date("2027-01-01T15:00:00Z");
    expect(weekStartDay(now, TORONTO)).toBe("2026-12-27");
    expect(startOfWeek(now, TORONTO).toISOString()).toBe("2026-12-27T05:00:00.000Z");
  });
});

describe("isInCurrentWeek", () => {
  const now = new Date("2026-10-07T19:00:00Z"); // Wed in Toronto

  it("includes everything from Sunday 00:00 up to now", () => {
    expect(isInCurrentWeek("2026-10-04T04:00:00Z", now, TORONTO)).toBe(true); // Sunday 00:00
    expect(isInCurrentWeek("2026-10-06T12:00:00Z", now, TORONTO)).toBe(true);
    expect(isInCurrentWeek(now, now, TORONTO)).toBe(true);
  });

  it("leaves out last Saturday night", () => {
    expect(isInCurrentWeek("2026-10-04T03:59:59Z", now, TORONTO)).toBe(false); // Sat 23:59:59
    expect(isInCurrentWeek("2026-09-30T12:00:00Z", now, TORONTO)).toBe(false);
  });

  it("gives a different answer for the same log in another timezone", () => {
    // Sat 3 Oct 23:30 UTC: last week for Toronto, this week for Auckland (already Sunday).
    const log = "2026-10-03T23:30:00Z";
    expect(isInCurrentWeek(log, now, TORONTO)).toBe(false);
    expect(isInCurrentWeek(log, now, AUCKLAND)).toBe(true);
  });

  it("allows a clock a few minutes fast, but not the real future", () => {
    expect(isInCurrentWeek("2026-10-07T19:03:00Z", now, TORONTO)).toBe(true);
    expect(isInCurrentWeek("2026-10-08T19:00:00Z", now, TORONTO)).toBe(false);
  });

  it("is false for something that isn't a time", () => {
    expect(isInCurrentWeek("soon", now, TORONTO)).toBe(false);
  });
});

describe("helpers", () => {
  it("knows weekdays from a day key", () => {
    expect(weekdayOf("2026-10-04")).toBe(0); // Sunday
    expect(weekdayOf("2026-10-10")).toBe(6); // Saturday
    expect(weekdayOf("2028-02-29")).toBe(2); // leap day, a Tuesday
  });

  it("finds local midnight either side of a clock change", () => {
    expect(zonedMidnight("2026-03-08", TORONTO).toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(zonedMidnight("2026-03-09", TORONTO).toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(zonedMidnight("2026-11-01", TORONTO).toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(zonedMidnight("2026-11-02", TORONTO).toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(zonedMidnight("2026-06-15", "UTC").toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(zonedMidnight("2026-06-15", "Asia/Kolkata").toISOString()).toBe("2026-06-14T18:30:00.000Z");
  });
});
