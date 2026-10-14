import { describe, expect, it } from "vitest";
import { canMoveLog } from "./log-edit";
import { LogEditSchema } from "./validation";

const base = { stool_type: 4, color: "brown", factors: [] as string[] };

describe("canMoveLog", () => {
  const NOW = new Date("2026-10-13T15:00:00Z");

  it("allows a log from today or yesterday", () => {
    expect(canMoveLog("2026-10-13T08:00:00Z", NOW, "UTC")).toBe(true);
    expect(canMoveLog("2026-10-12T23:59:00Z", NOW, "UTC")).toBe(true);
  });

  it("locks the time of anything older", () => {
    expect(canMoveLog("2026-10-11T23:59:00Z", NOW, "UTC")).toBe(false);
    expect(canMoveLog("2026-09-01T12:00:00Z", NOW, "UTC")).toBe(false);
  });

  it("goes by the person's own day, so two zones can disagree", () => {
    // 2026-10-11 16:00Z is 17:00 on Oct 11 in London but already 01:00 on Oct 12 in Tokyo.
    const at = "2026-10-11T16:00:00Z";
    const now = new Date("2026-10-13T03:00:00Z"); // Oct 13 in London, Oct 13 in Tokyo
    expect(canMoveLog(at, now, "Europe/London")).toBe(false);
    expect(canMoveLog(at, now, "Asia/Tokyo")).toBe(true);
  });

  it("is false for a time that isn't a time", () => {
    expect(canMoveLog("not a date", NOW, "UTC")).toBe(false);
  });
});

describe("LogEditSchema", () => {
  it("accepts an edit with no time at all (an older log keeps its own)", () => {
    expect(LogEditSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a new time with its local day", () => {
    const r = LogEditSchema.safeParse({ ...base, logged_at: "2026-10-13T08:00:00Z", local_day: "2026-10-13" });
    expect(r.success).toBe(true);
  });

  it("refuses a time without its day, and a day without a time", () => {
    expect(LogEditSchema.safeParse({ ...base, logged_at: "2026-10-13T08:00:00Z" }).success).toBe(false);
    expect(LogEditSchema.safeParse({ ...base, local_day: "2026-10-13" }).success).toBe(false);
  });

  it("refuses a bad type, colour, habit or oversized note", () => {
    expect(LogEditSchema.safeParse({ ...base, stool_type: 8 }).success).toBe(false);
    expect(LogEditSchema.safeParse({ ...base, stool_type: 0 }).success).toBe(false);
    expect(LogEditSchema.safeParse({ ...base, color: "purple" }).success).toBe(false);
    expect(LogEditSchema.safeParse({ ...base, factors: ["nonsense"] }).success).toBe(false);
    expect(LogEditSchema.safeParse({ ...base, notes: "x".repeat(501) }).success).toBe(false);
  });

  it("turns an emptied note into null so it clears", () => {
    const r = LogEditSchema.safeParse({ ...base, notes: "   " });
    expect(r.success && r.data.notes).toBeNull();
  });

  it("drops fields a client must never write", () => {
    const r = LogEditSchema.safeParse({ ...base, user_id: "x", category: "healthy", created_at: "2020-01-01T00:00:00Z" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty("user_id");
      expect(r.data).not.toHaveProperty("category");
      expect(r.data).not.toHaveProperty("created_at");
    }
  });
});
