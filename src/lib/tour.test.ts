import { describe, expect, it } from "vitest";
import { gardenTour } from "./tour";

// Every data-tour value that exists on the Garden screen (Dashboard,
// TodayCard, StreakCard, Garden, TopNav, AccountLink).
const ON_SCREEN = ["mia", "today", "quiet", "streak", "garden", "insights", "friends", "account"];

describe("Mia's tour", () => {
  const steps = gardenTour("Sam", "other", true);

  it("opens with a welcome and ends with a send-off, neither pointing at anything", () => {
    expect(steps[0].body).toContain("Welcome, Sam!");
    expect(steps[0].target).toBeUndefined();
    expect(steps.at(-1)?.target).toBeUndefined();
  });

  it("only points at things that are on the screen", () => {
    for (const step of steps) if (step.target) expect(ON_SCREEN).toContain(step.target);
  });

  it("covers badges, friends and the avatar", () => {
    const targets = steps.map((s) => s.target);
    expect(targets).toContain("friends");
    expect(targets).toContain("account");
    expect(steps.find((s) => s.target === "streak")?.body).toMatch(/badges/i);
    expect(steps.find((s) => s.target === "account")?.body).toMatch(/avatar/i);
  });

  it("says friends never see what was logged", () => {
    expect(steps.find((s) => s.target === "friends")?.body).toMatch(/never what you logged/);
  });

  it("skips the quiet-day step when there's nothing to tap", () => {
    expect(gardenTour("Sam", "other", false).map((s) => s.target)).not.toContain("quiet");
    expect(steps.map((s) => s.target)).toContain("quiet");
  });

  it("keeps each card short enough to read at a glance", () => {
    for (const step of steps) {
      expect(step.title.length).toBeLessThanOrEqual(30);
      expect(step.body.length).toBeLessThanOrEqual(150);
    }
  });
});
