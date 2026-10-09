import { describe, expect, it } from "vitest";
import { heyFor, isGender } from "./greeting";
import { dashboardLines } from "./dialogue";
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

  it("opens the dashboard line", () => {
    const lines = dashboardLines("Sam", "female", buildGarden([], [], NOW), [], NOW);
    expect(lines[0].startsWith("Hey Queen! ")).toBe(true);
    expect(lines[0]).toContain("Sam");
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
