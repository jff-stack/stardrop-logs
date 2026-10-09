import { describe, expect, it } from "vitest";
import { SESSION_COOKIE_OPTIONS, SESSION_MAX_AGE } from "./session";

describe("session cookie", () => {
  it("lasts as long as browsers allow (400 days)", () => {
    expect(SESSION_MAX_AGE).toBe(34_560_000);
    expect(SESSION_COOKIE_OPTIONS.maxAge).toBe(SESSION_MAX_AGE);
  });

  it("is site-wide and not sent on cross-site requests", () => {
    expect(SESSION_COOKIE_OPTIONS.path).toBe("/");
    expect(SESSION_COOKIE_OPTIONS.sameSite).toBe("lax");
  });
});
