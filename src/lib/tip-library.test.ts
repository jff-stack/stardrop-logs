import { describe, expect, it } from "vitest";
import { SOURCES, TIPS, TOPIC_LABEL, TOPIC_ORDER, tipById } from "./tip-library";

const BANNED = [
  "laxative", "softener", "detox", "cleanse", "flush", "supplement", "magnesium", "probiotic",
  "diagnos", "cure", "treat", "calorie", "weight loss", "fasting", "constipated", "ibs",
];

describe("tip library text rules", () => {
  it("has unique ids", () => {
    const ids = TIPS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every tip short (safety tips under get-checked may run to 200)", () => {
    for (const t of TIPS) {
      const max = t.topic === "get-checked" ? 200 : 140;
      expect(t.text.length, t.id).toBeLessThanOrEqual(max);
    }
  });

  it("uses none of the banned words", () => {
    for (const t of TIPS) {
      const text = t.text.toLowerCase();
      for (const word of BANNED) expect(text, `${t.id}: ${word}`).not.toContain(word);
    }
  });

  it("never tells the reader they have or are something", () => {
    for (const t of TIPS) expect(t.text, t.id).not.toMatch(/\byou (have|are)\b/i);
  });

  it("hedges every tip with limited evidence", () => {
    for (const t of TIPS.filter((x) => x.evidence === "limited")) {
      expect(t.text, t.id).toMatch(/\b(some|may|many people)\b/i);
    }
  });

  it("only uses known topics, and every topic has a label", () => {
    for (const t of TIPS) expect(TOPIC_ORDER).toContain(t.topic);
    for (const topic of TOPIC_ORDER) expect(TOPIC_LABEL[topic]).toBeTruthy();
  });

  it("points every sourceId at a real source, with links only on https pages", () => {
    for (const t of TIPS) if (t.sourceId) expect(SOURCES[t.sourceId], t.id).toBeDefined();
    for (const s of Object.values(SOURCES)) {
      expect(s.label).toBeTruthy();
      if (s.url) expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it("does not ship the two held-back tips", () => {
    expect(tipById("check-lasting")).toBeUndefined();
    expect(tipById("travel-dont-hold")).toBeUndefined();
  });

  it("covers every audience the engine can ask for", () => {
    for (const audience of ["any", "hard", "loose", "gap", "steady"] as const) {
      expect(TIPS.some((t) => t.audience === audience), audience).toBe(true);
    }
  });
});
