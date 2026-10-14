import { beforeEach, describe, expect, it, vi } from "vitest";

// updateLog talks to Supabase through getUser(); here that is a recording fake,
// so the test sees exactly what would be sent: which columns, which row, and
// whether a quiet day is cleared.
const calls: { table: string; op: string; payload?: unknown; filters: [string, unknown][] }[] = [];
let updateResult: { data: { category: string } | null; error: { code?: string } | null };
let signedIn = true;

function builder(table: string) {
  const call: (typeof calls)[number] = { table, op: "", filters: [] };
  calls.push(call);
  const chain = {
    update(payload: unknown) {
      call.op = "update";
      call.payload = payload;
      return chain;
    },
    delete() {
      call.op = "delete";
      return chain;
    },
    eq(col: string, val: unknown) {
      call.filters.push([col, val]);
      return chain;
    },
    select() {
      return chain;
    },
    single: async () => updateResult,
    then(resolve: (v: unknown) => void) {
      resolve({ error: null });
    },
  };
  return chain;
}

vi.mock("@/lib/auth", () => ({
  getUser: async () => ({ supabase: { from: builder }, user: signedIn ? { id: "u1" } : null }),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const { updateLog } = await import("./logs");

const ID = "11111111-1111-4111-8111-111111111111";
const edit: Parameters<typeof updateLog>[1] = { stool_type: 6, color: "green", factors: ["coffee"] };

beforeEach(() => {
  calls.length = 0;
  signedIn = true;
  updateResult = { data: { category: "loose" }, error: null };
});

describe("updateLog", () => {
  it("sends only the editable columns, for that one row, and leaves the time alone", async () => {
    const res = await updateLog(ID, { ...edit, notes: " fixed " });
    expect(res).toEqual({ ok: true, category: "loose", day: null });
    const update = calls.find((c) => c.op === "update")!;
    expect(update.table).toBe("poop_logs");
    expect(update.filters).toEqual([["id", ID]]);
    expect(update.payload).toEqual({ stool_type: 6, color: "green", factors: ["coffee"], notes: "fixed" });
    // No quiet-day cleanup when the day didn't change.
    expect(calls.some((c) => c.table === "quiet_days")).toBe(false);
  });

  it("sends the new time, and clears a quiet day on the day it moved to", async () => {
    const at = new Date(Date.now() - 3_600_000).toISOString();
    const res = await updateLog(ID, { ...edit, logged_at: at, local_day: "2026-10-13" });
    expect(res).toEqual({ ok: true, category: "loose", day: "2026-10-13" });
    expect((calls.find((c) => c.op === "update")!.payload as Record<string, unknown>).logged_at).toBe(at);
    const quiet = calls.find((c) => c.table === "quiet_days")!;
    expect(quiet.op).toBe("delete");
    expect(quiet.filters).toEqual([["day", "2026-10-13"]]);
  });

  it("refuses a time older than yesterday before asking the database", async () => {
    const old = new Date(Date.now() - 5 * 86_400_000).toISOString();
    const res = await updateLog(ID, { ...edit, logged_at: old, local_day: "2026-10-08" });
    expect(res.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("never lets a client write the owner, the category or created_at", async () => {
    await updateLog(ID, { ...edit, user_id: "someone-else", category: "dry", created_at: "2020-01-01T00:00:00Z" } as never);
    const payload = calls.find((c) => c.op === "update")!.payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["color", "factors", "notes", "stool_type"]);
  });

  it("says so when no row was changed (someone else's id, or one that is gone)", async () => {
    updateResult = { data: null, error: { code: "PGRST116" } };
    const res = await updateLog(ID, edit);
    expect(res.ok).toBe(false);
    expect(calls.some((c) => c.table === "quiet_days")).toBe(false);
  });

  it("asks to sign in again when the session ran out", async () => {
    signedIn = false;
    const res = await updateLog(ID, edit);
    expect(res).toEqual({ ok: false, error: "Your session ran out. Please sign in again." });
    expect(calls).toHaveLength(0);
  });

  it("refuses a bad id or a bad value without touching the database", async () => {
    expect((await updateLog("nope", edit)).ok).toBe(false);
    expect((await updateLog(ID, { ...edit, color: "purple" } as never)).ok).toBe(false);
    expect((await updateLog(ID, { ...edit, logged_at: new Date().toISOString() })).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});
