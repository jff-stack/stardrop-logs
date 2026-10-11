import { describe, expect, it } from "vitest";
import { NAME_MAX, normaliseName } from "./name";
import { ProfileSchema, SignUpSchema } from "./validation";

describe("normaliseName", () => {
  it("trims the ends and squeezes inner whitespace to one space", () => {
    expect(normaliseName("  Sam  ")).toBe("Sam");
    expect(normaliseName("Sam    Lee")).toBe("Sam Lee");
    expect(normaliseName("Sam\t\n Lee")).toBe("Sam Lee");
  });

  it("treats non-breaking and other unicode spaces as spaces", () => {
    expect(normaliseName(" Sam  Lee　")).toBe("Sam Lee");
  });

  it("drops control characters", () => {
    expect(normaliseName("Sa\u0000m\u0007")).toBe("Sam");
    expect(normaliseName("Sam\u007f\u0085")).toBe("Sam");
    // One sitting between two spaces must not leave a double space behind.
    expect(normaliseName("Sam \u0001 Lee")).toBe("Sam Lee");
  });

  it("stores accents in one consistent form", () => {
    expect(normaliseName("José")).toBe("José");
    expect(normaliseName("Zoë")).toBe("Zoë");
  });

  it("keeps other alphabets and emoji whole", () => {
    expect(normaliseName(" 山田 太郎 ")).toBe("山田 太郎");
    expect(normaliseName("Sam 🌱")).toBe("Sam 🌱");
    const family = "👩‍👩‍👧";
    expect(normaliseName(family)).toBe(family);
  });

  it("turns empty and whitespace-only input into an empty string", () => {
    expect(normaliseName("")).toBe("");
    expect(normaliseName(" \t\n  ")).toBe("");
    expect(normaliseName("\u0001\u0002")).toBe("");
  });

  it("leaves the length alone (the schemas enforce it)", () => {
    expect(normaliseName("x".repeat(NAME_MAX + 5))).toHaveLength(NAME_MAX + 5);
  });
});

describe("name in forms", () => {
  const signUp = { email: "sam@example.com", password: "longenough1", dob: "1990-05-05", agree: "on" };

  it("settings saves the cleaned name", () => {
    expect(ProfileSchema.parse({ display_name: "  Sam \t Lee " }).display_name).toBe("Sam Lee");
  });

  it("settings rejects empty, blank and control-only names", () => {
    for (const bad of ["", "   ", "\t\n", "\u0001"]) {
      expect(ProfileSchema.safeParse({ display_name: bad }).success).toBe(false);
    }
  });

  it("measures the length after cleaning", () => {
    const max = "x".repeat(NAME_MAX);
    expect(ProfileSchema.safeParse({ display_name: max }).success).toBe(true);
    expect(ProfileSchema.safeParse({ display_name: `  ${max}  ` }).success).toBe(true);
    expect(ProfileSchema.safeParse({ display_name: `${max}x` }).success).toBe(false);
    expect(SignUpSchema.safeParse({ ...signUp, display_name: `${max}x` }).success).toBe(false);
  });

  it("sign-up cleans the name the same way, and may leave it empty", () => {
    expect(SignUpSchema.parse({ ...signUp, display_name: "  Sam \t Lee " }).display_name).toBe("Sam Lee");
    expect(SignUpSchema.parse({ ...signUp, display_name: "   " }).display_name).toBe("");
    expect(SignUpSchema.parse(signUp).display_name).toBe("");
  });
});
