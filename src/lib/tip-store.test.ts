import { describe, expect, it } from "vitest";
import { SEEN_MAX, parseSeen } from "./tip-store";

describe("parseSeen", () => {
  it("reads what was saved", () => {
    expect(parseSeen(JSON.stringify([{ id: "footstool", day: "2026-10-09" }]))).toEqual([
      { id: "footstool", day: "2026-10-09" },
    ]);
  });

  it("shrugs off anything that isn't a list of ids and days", () => {
    for (const raw of [null, "", "not json", "{}", "42", "[1,2]", '[{"id":5,"day":"2026-10-09"}]']) {
      expect(parseSeen(raw)).toEqual([]);
    }
  });

  it("drops malformed entries but keeps good ones", () => {
    const raw = JSON.stringify([
      { id: "ok-tip", day: "2026-10-09" },
      { id: "<script>", day: "2026-10-09" },
      { id: "ok-two", day: "yesterday" },
    ]);
    expect(parseSeen(raw)).toEqual([{ id: "ok-tip", day: "2026-10-09" }]);
  });

  it("keeps only the newest SEEN_MAX", () => {
    const many = Array.from({ length: SEEN_MAX + 20 }, (_, i) => ({ id: `tip-${i}`, day: "2026-10-09" }));
    const out = parseSeen(JSON.stringify(many));
    expect(out).toHaveLength(SEEN_MAX);
    expect(out.at(-1)!.id).toBe(`tip-${SEEN_MAX + 19}`);
  });
});
