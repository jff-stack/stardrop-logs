// Runs the real @supabase/ssr client against a pretend Auth server to check
// what cookies end up on the redirect after an email link is verified.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://testproject.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "sb_publishable_test";
});

import { createRouteClient } from "./route";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600;
const ACCESS_TOKEN = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "user-1", exp, role: "authenticated" })}.sig`;
const SESSION = {
  access_token: ACCESS_TOKEN,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: exp,
  refresh_token: "refresh-token-1",
  user: {
    id: "user-1",
    aud: "authenticated",
    role: "authenticated",
    email: "a@test.local",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let calls: string[] = [];

beforeEach(() => {
  calls = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(new URL(url).pathname);
    if (url.includes("/auth/v1/verify")) return json(SESSION);
    if (url.includes("/auth/v1/logout")) return new Response(null, { status: 204 });
    return json({ code: "not_found" }, 404);
  });
});
afterEach(() => vi.unstubAllGlobals());

const request = (cookie?: string) =>
  new NextRequest("http://localhost:3000/auth/confirm?token_hash=abc&type=email", {
    headers: cookie ? { cookie } : undefined,
  });

const redirect = () => NextResponse.redirect("http://localhost:3000/somewhere");

/** The auth cookies a response sets or clears. */
const authCookies = (res: NextResponse) =>
  res.cookies.getAll().filter((c) => /^sb-.*-auth-token/.test(c.name));

describe("email-link cookies", () => {
  it("leaves the session on the redirect when we keep it (password recovery)", async () => {
    const { supabase, withCookies } = createRouteClient(request());
    const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: "abc" });
    expect(error).toBeNull();

    const cookies = authCookies(withCookies(redirect()));
    expect(cookies.length).toBeGreaterThan(0);
    expect(cookies.every((c) => c.value !== "" && (c.maxAge ?? 0) > 0)).toBe(true);
  });

  it("clears the session on the redirect after a sign-up confirmation", async () => {
    const { supabase, withCookies } = createRouteClient(request());
    await supabase.auth.verifyOtp({ type: "email", token_hash: "abc" });
    await supabase.auth.signOut({ scope: "local" });

    const res = withCookies(redirect());
    const cookies = authCookies(res);
    // The browser is told to drop the cookie, and nothing carries a token.
    expect(cookies.length).toBeGreaterThan(0);
    expect(cookies.every((c) => c.value === "" && c.maxAge === 0)).toBe(true);
    expect(res.headers.getSetCookie().join("\n")).not.toContain("refresh-token-1");
    // The session is ended on the server too, not just forgotten here.
    expect(calls).toContain("/auth/v1/logout");
  });

  it("also clears a session the visitor already had", async () => {
    const old = b64({ ...SESSION, refresh_token: "old-refresh" });
    const name = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
    const { supabase, withCookies } = createRouteClient(request(`${name}=base64-${old}`));
    await supabase.auth.verifyOtp({ type: "signup", token_hash: "abc" });
    await supabase.auth.signOut({ scope: "local" });

    const res = withCookies(redirect());
    const cookies = authCookies(res);
    expect(cookies.length).toBeGreaterThan(0);
    expect(cookies.every((c) => c.value === "" && c.maxAge === 0)).toBe(true);
    expect(res.headers.getSetCookie().join("\n")).not.toMatch(/refresh-token-1|old-refresh/);
  });

  it("sets nothing when the link is rejected", async () => {
    vi.stubGlobal("fetch", async () => json({ code: "otp_expired", msg: "Token has expired or is invalid" }, 403));
    const { supabase, withCookies } = createRouteClient(request());
    const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: "abc" });
    expect(error).not.toBeNull();
    expect(withCookies(redirect()).headers.getSetCookie()).toEqual([]);
  });
});
