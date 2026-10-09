import { describe, expect, it } from "vitest";
import { LogSchema, SignUpSchema, ageOn, isOldEnough, parseDob, safeNext } from "./validation";

describe("safeNext", () => {
  it("keeps normal relative paths", () => {
    expect(safeNext("/insights")).toBe("/insights");
    expect(safeNext("/log?x=1")).toBe("/log?x=1");
  });

  it("blocks open redirects", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "evil.com", "", null, undefined]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});

describe("age gate", () => {
  const today = new Date(2026, 9, 9); // Oct 9 2026

  it("counts birthdays correctly", () => {
    expect(ageOn(new Date(2008, 9, 9), today)).toBe(18);
    expect(ageOn(new Date(2008, 9, 10), today)).toBe(17);
  });

  it("lets 18-year-olds in and keeps 17-year-olds out", () => {
    expect(isOldEnough(new Date(2008, 9, 9), today)).toBe(true);
    expect(isOldEnough(new Date(2008, 9, 10), today)).toBe(false);
  });

  it("rejects impossible or future dates", () => {
    expect(parseDob("2001-02-31")).toBeNull();
    expect(parseDob("1899-12-31")).toBeNull();
    expect(parseDob("3000-01-01")).toBeNull();
    expect(parseDob("not a date")).toBeNull();
    expect(parseDob("1995-04-12")).not.toBeNull();
  });
});

describe("SignUpSchema", () => {
  const ok = {
    display_name: "Jo",
    email: "jo@example.com",
    password: "longenough",
    dob: "1995-04-12",
    agree: "on",
  };

  it("accepts a valid sign-up", () => {
    expect(SignUpSchema.safeParse(ok).success).toBe(true);
  });

  it("requires the checkbox, a real email and an 8+ char password", () => {
    expect(SignUpSchema.safeParse({ ...ok, agree: undefined }).success).toBe(false);
    expect(SignUpSchema.safeParse({ ...ok, email: "nope" }).success).toBe(false);
    expect(SignUpSchema.safeParse({ ...ok, password: "short" }).success).toBe(false);
  });
});

describe("LogSchema", () => {
  const ok = {
    stool_type: 4,
    color: "brown",
    factors: ["hydrated", "hydrated"],
    logged_at: "2026-10-09T08:00:00.000Z",
    notes: "  hi  ",
    local_day: "2026-10-09",
  };

  it("accepts a valid log and tidies it up", () => {
    const parsed = LogSchema.parse(ok);
    expect(parsed.factors).toEqual(["hydrated"]);
    expect(parsed.notes).toBe("hi");
  });

  it("turns an empty note into null", () => {
    expect(LogSchema.parse({ ...ok, notes: "   " }).notes).toBeNull();
  });

  it("rejects out-of-range or unknown values", () => {
    expect(LogSchema.safeParse({ ...ok, stool_type: 8 }).success).toBe(false);
    expect(LogSchema.safeParse({ ...ok, color: "purple" }).success).toBe(false);
    expect(LogSchema.safeParse({ ...ok, factors: ["pizza"] }).success).toBe(false);
    expect(LogSchema.safeParse({ ...ok, notes: "x".repeat(501) }).success).toBe(false);
    expect(LogSchema.safeParse({ ...ok, local_day: "10/09/2026" }).success).toBe(false);
  });
});
