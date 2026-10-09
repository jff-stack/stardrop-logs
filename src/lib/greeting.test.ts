import { describe, expect, it } from "vitest";
import { heyFor, isGender } from "./greeting";
import { dashboardLines, hellos } from "./dialogue";
import { buildGarden } from "./farm";
import { ProfileSchema, SignUpSchema } from "./validation";

const NOW = new Date(2026, 9, 9, 9, 0);

describe("Mia's hello", () => {
  it("matches the gender", () => {
    expect(heyFor("female")).toBe("Hey Queen!");
    expect(heyFor("male")).toBe("Hey Buddy!");
    expect(heyFor("other")).toBe("Hey there!");
    expect(heyFor(null)).toBe("Hey there!");
  });

  it("mixes gendered hellos, a plain Hi name, and time-of-day lines", () => {
    const options = hellos("Sam", "female", NOW);
    expect(options.some((h) => h.startsWith("Hey Queen!"))).toBe(true);
    expect(options).toContain("Hi Sam!");
    expect(hellos("Sam", "male", NOW).some((h) => h.startsWith("Hey Buddy!"))).toBe(true);
    expect(options.every((h) => h.includes("Sam"))).toBe(true);
  });

  it("opens the dashboard line with one of them", () => {
    const lines = dashboardLines("Sam", "female", buildGarden([], [], NOW), [], NOW);
    expect(hellos("Sam", "female", NOW).some((h) => lines[0].startsWith(h))).toBe(true);
  });

  it("only accepts the three values", () => {
    expect(isGender("female")).toBe(true);
    expect(isGender("queen")).toBe(false);
  });
});

describe("gender in forms", () => {
  const base = {
    display_name: "Sam",
    email: "sam@example.com",
    password: "longenough1",
    dob: "1990-05-05",
    agree: "on",
  };

  it("defaults to other when not picked", () => {
    expect(SignUpSchema.parse(base).gender).toBe("other");
  });

  it("rejects anything outside the list", () => {
    expect(SignUpSchema.safeParse({ ...base, gender: "admin" }).success).toBe(false);
    expect(ProfileSchema.safeParse({ display_name: "Sam", gender: "male" }).success).toBe(true);
  });
});
