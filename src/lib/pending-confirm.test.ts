import { describe, expect, it } from "vitest";
import { RESEND_COOLDOWN_S, secondsLeft } from "./pending-confirm";

describe("resend cooldown", () => {
  const sent = 1_000_000;

  it("is a minute", () => {
    expect(RESEND_COOLDOWN_S).toBe(60);
  });

  it("counts down from the last send", () => {
    expect(secondsLeft(sent, sent)).toBe(60);
    expect(secondsLeft(sent, sent + 500)).toBe(60);
    expect(secondsLeft(sent, sent + 18_000)).toBe(42);
    expect(secondsLeft(sent, sent + 59_001)).toBe(1);
  });

  it("is over after a minute", () => {
    expect(secondsLeft(sent, sent + 60_000)).toBe(0);
    expect(secondsLeft(sent, sent + 600_000)).toBe(0);
  });

  it("is zero when nothing was sent", () => {
    expect(secondsLeft(0, sent)).toBe(0);
  });

  it("never waits longer than a minute if the clock jumps back", () => {
    expect(secondsLeft(sent, sent - 3_600_000)).toBe(60);
  });
});
