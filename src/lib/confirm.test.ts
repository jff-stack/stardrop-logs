import { describe, expect, it } from "vitest";
import { confirmDestination, isKnownType } from "./confirm";

const HOSTILE = ["//evil.com", "https://evil.com", "/\\evil.com", "evil.com", "javascript:alert(1)"];

describe("confirmDestination", () => {
  it("sends a confirmed sign-up to the verified page and drops the session", () => {
    for (const type of ["signup", "email"]) {
      for (const flow of ["token", "code"] as const) {
        expect(confirmDestination({ flow, type, ok: true })).toEqual({ path: "/email-verified", signOut: true });
      }
    }
  });

  it("ignores ?next= for a sign-up confirmation", () => {
    for (const next of ["/insights", "/reset", ...HOSTILE]) {
      expect(confirmDestination({ flow: "token", type: "signup", ok: true, next }).path).toBe("/email-verified");
    }
  });

  it("keeps password recovery signed in and on /reset", () => {
    expect(confirmDestination({ flow: "token", type: "recovery", ok: true, next: "/reset" }))
      .toEqual({ path: "/reset", signOut: false });
    expect(confirmDestination({ flow: "token", type: "recovery", ok: true })).toEqual({ path: "/reset", signOut: false });
    // The default templates send recovery through the code flow with no type.
    expect(confirmDestination({ flow: "code", type: null, ok: true, next: "/reset" }))
      .toEqual({ path: "/reset", signOut: false });
  });

  it("sends an email change to settings", () => {
    expect(confirmDestination({ flow: "token", type: "email_change", ok: true }))
      .toEqual({ path: "/settings", signOut: false });
  });

  it("sends the other link types home, signed in", () => {
    for (const type of ["invite", "magiclink"]) {
      expect(confirmDestination({ flow: "token", type, ok: true })).toEqual({ path: "/", signOut: false });
    }
    expect(confirmDestination({ flow: "code", type: null, ok: true })).toEqual({ path: "/", signOut: false });
    expect(confirmDestination({ flow: "code", type: undefined, ok: true, next: "/insights" }).path).toBe("/insights");
  });

  it("never follows a hostile ?next=", () => {
    for (const next of HOSTILE) {
      expect(confirmDestination({ flow: "token", type: "recovery", ok: true, next }).path).toBe("/reset");
      expect(confirmDestination({ flow: "token", type: "email_change", ok: true, next }).path).toBe("/settings");
      expect(confirmDestination({ flow: "token", type: "magiclink", ok: true, next }).path).toBe("/");
      expect(confirmDestination({ flow: "code", type: null, ok: true, next }).path).toBe("/");
    }
  });

  it("sends any failure to the error page, whatever else is in the link", () => {
    for (const type of ["signup", "email", "recovery", "email_change", "nonsense", null]) {
      for (const flow of ["token", "code"] as const) {
        expect(confirmDestination({ flow, type, ok: false, next: "/reset" }))
          .toEqual({ path: "/auth/error", signOut: false });
      }
    }
  });

  it("refuses unknown or missing types", () => {
    for (const type of ["nonsense", "SIGNUP", "sms", "", null, undefined]) {
      expect(confirmDestination({ flow: "token", type, ok: true }).path).toBe("/auth/error");
    }
    // A code link may leave the type out, but not make one up.
    expect(confirmDestination({ flow: "code", type: "nonsense", ok: true }).path).toBe("/auth/error");
  });
});

describe("isKnownType", () => {
  it("accepts only the six link types", () => {
    expect(isKnownType("signup")).toBe(true);
    expect(isKnownType("recovery")).toBe(true);
    expect(isKnownType("phone_change")).toBe(false);
    expect(isKnownType(null)).toBe(false);
  });
});
