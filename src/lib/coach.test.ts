import { describe, expect, it } from "vitest";
import { REMINDER_TEXT, circularDistance, circularMedian, coach, minutesOfDay, type CoachInput } from "./coach";
import { categoryOf } from "./bristol";
import { addDays } from "./dates";
import { TIPS, tipById, type Tip } from "./tip-library";
import { zonedMidnight } from "./week";
import type { Factor, PoopLog, StoolColor, StoolType } from "./types";

// 2026-10-09, 20:00 UTC. Most tests run in UTC so a day is a day.
const NOW = new Date(Date.UTC(2026, 9, 9, 20, 0));
const TODAY = "2026-10-09";
const day = (back: number) => addDays(TODAY, -back);

let n = 0;
function log(
  back: number,
  type: StoolType,
  opts: { h?: number; m?: number; factors?: Factor[]; color?: StoolColor } = {},
): PoopLog {
  const [y, mo, d] = day(back).split("-").map(Number);
  return {
    id: `l${n++}`,
    stool_type: type,
    category: categoryOf(type),
    color: opts.color ?? "brown",
    factors: opts.factors ?? [],
    logged_at: new Date(Date.UTC(y, mo - 1, d, opts.h ?? 9, opts.m ?? 0)).toISOString(),
    notes: null,
  };
}

const base = (over: Partial<CoachInput>): CoachInput => ({
  logs: [],
  quietDays: [],
  now: NOW,
  tz: "UTC",
  seen: [],
  tipsEnabled: true,
  remindersEnabled: true,
  ...over,
});

/** A library with the safety tip present, for the sustained-pattern tests. */
const WITH_SAFETY: Tip[] = [
  ...TIPS,
  { id: "check-lasting", topic: "get-checked", audience: "any", evidence: "strong", text: "Safety." },
];

/** The five most recent logs, one a day for the last five days, newest first in `types`. */
const lastFive = (types: StoolType[], from = 1) => types.map((t, i) => log(from + i, t));

const ids = (audience: Tip["audience"]) => TIPS.filter((t) => t.audience === audience).map((t) => t.id);

describe("patterns", () => {
  it("gives a user with hard logs hard-audience tips, never loose ones", () => {
    const r = coach(base({ logs: lastFive([1, 2, 1, 4, 4]) }));
    expect(r.why).toBe("Because 3 of your last 5 logs were type 1-2.");
    expect(ids("hard")).toContain(r.primary!.id);
    for (const t of [r.primary, r.extra?.tip]) {
      if (t) expect(ids("loose")).not.toContain(t.id);
    }
  });

  it("gives a user with loose logs loose-audience tips, never hard ones", () => {
    const r = coach(base({ logs: lastFive([6, 7, 6, 4, 4]) }));
    expect(r.why).toBe("Because 3 of your last 5 logs were type 6-7.");
    expect(ids("loose")).toContain(r.primary!.id);
    for (const t of [r.primary, r.extra?.tip]) {
      if (t) expect(ids("hard")).not.toContain(t.id);
    }
  });

  it("picks hard when the last five hold three hard and two loose (never both)", () => {
    const r = coach(base({ logs: lastFive([1, 6, 2, 7, 1]) }));
    expect(r.why).toContain("type 1-2");
  });

  it("only looks at the last five logs, not older ones", () => {
    const r = coach(base({ logs: [...lastFive([4, 4, 4, 4, 4]), log(6, 1), log(7, 1), log(8, 1)] }));
    expect(r.why).not.toContain("type 1-2");
  });

  it("recognises a steady stretch of types 3-5", () => {
    const r = coach(base({ logs: lastFive([3, 4, 5, 4, 3]) }));
    expect(r.why).toBe("Because your last 5 logs were all type 3-5.");
    expect(r.primary!.id).toBe("routine-normal-range");
  });

  it("keeps patterns quiet with fewer than five logs", () => {
    const r = coach(base({ logs: [log(1, 1), log(2, 1), log(3, 1), log(4, 2)] }));
    expect(r.why).toBe("A tip for any day.");
    expect(ids("any")).toContain(r.primary!.id);
  });

  it("ignores logs older than 14 days for the recent pattern", () => {
    const r = coach(base({ logs: [log(1, 4), log(2, 4), log(20, 1), log(21, 1), log(22, 1), log(23, 1), log(24, 1)] }));
    expect(r.why).not.toContain("type 1-2");
  });
});

describe("gaps use the person's own baseline", () => {
  const everyThree = Array.from({ length: 8 }, (_, k) => log(3 + k * 3, 4));

  it("doesn't call day 3 a gap for someone who goes every 3 days", () => {
    const r = coach(base({ logs: everyThree }));
    expect(r.why).not.toContain("gap");
  });

  it("does once it is well past their usual gap", () => {
    // Last log 6 days ago against a 3-day habit: 6 >= ceil(1.5 * 3) = 5.
    const logs = Array.from({ length: 8 }, (_, k) => log(6 + k * 3, 4));
    const r = coach(base({ logs }));
    expect(r.why).toBe("Because it's been longer than your usual gap between logs.");
    expect(ids("gap")).toContain(r.primary!.id);
  });

  it("flags two days for someone who goes daily, never one", () => {
    const daily = (from: number) => Array.from({ length: 8 }, (_, k) => log(from + k, 4));
    expect(coach(base({ logs: daily(1) })).why).not.toContain("gap");
    expect(coach(base({ logs: daily(2) })).why).toContain("gap");
  });

  it("needs five logs of history", () => {
    const r = coach(base({ logs: [log(5, 4), log(6, 4), log(7, 4), log(8, 4)] }));
    expect(r.why).not.toContain("gap");
  });
});

describe("sustained pattern", () => {
  // Dry logs are spread through the fortnight so the last-five pattern isn't what fires.
  const spread = (total: number, dry: number): PoopLog[] => {
    const types: StoolType[] = Array.from({ length: total }, (_, i) => (i * dry) % total < dry ? 1 : 4);
    return types.map((t, i) => log(Math.floor((i * 14) / total), t, { h: 7 + (i % 3) }));
  };

  it("shows the safety tip at 70% and not at 69%", () => {
    const at70 = coach(base({ logs: spread(30, 21), library: WITH_SAFETY }));
    expect(at70.primary?.id).toBe("check-lasting");
    const at69 = coach(base({ logs: spread(29, 20), library: WITH_SAFETY }));
    expect(at69.primary?.id).not.toBe("check-lasting");
  });

  it("needs two weeks of history and eight logs", () => {
    const young = Array.from({ length: 10 }, (_, i) => log(i % 9, 1, { h: 7 + (i % 3) }));
    expect(coach(base({ logs: young, library: WITH_SAFETY })).primary?.id).not.toBe("check-lasting");
    const few = [log(0, 1), log(5, 1), log(13, 1), log(8, 6), log(9, 7), log(10, 1), log(11, 2)];
    expect(coach(base({ logs: few, library: WITH_SAFETY })).primary?.id).not.toBe("check-lasting");
  });

  it("never shows on a single log", () => {
    const r = coach(base({ logs: [log(0, 1)], library: WITH_SAFETY }));
    expect(r.primary?.id).not.toBe("check-lasting");
  });

  it("shows once per 14 days", () => {
    const logs = spread(30, 21);
    const seen = [{ id: "check-lasting", day: day(5) }];
    expect(coach(base({ logs, library: WITH_SAFETY, seen })).primary?.id).not.toBe("check-lasting");
    const old = [{ id: "check-lasting", day: day(15) }];
    expect(coach(base({ logs, library: WITH_SAFETY, seen: old })).primary?.id).toBe("check-lasting");
  });

  it("shows nothing sustained from the shipped library, which holds no such tip yet", () => {
    expect(tipById("check-lasting")).toBeUndefined();
    const r = coach(base({ logs: spread(30, 21) }));
    expect(r.primary).not.toBeNull();
  });
});

describe("safety and quiet", () => {
  it("adds nothing beside a colour that has its own message", () => {
    const r = coach(base({ logs: [log(0, 4, { color: "black" }), log(1, 4), log(2, 4), log(3, 4), log(4, 4)] }));
    expect(r.primary).toBeNull();
    expect(r.reminder).toBeNull();
  });

  it("adds nothing when the count above the usual ceiling keeps happening", () => {
    const busy = [0, 0, 0, 0, 1, 1, 1, 1].map((b) => log(b, 4));
    const r = coach(base({ logs: busy }));
    expect(r).toEqual({ primary: null, why: "", extra: null, reminder: null });
  });

  it("stays quiet when Tips is off", () => {
    const r = coach(base({ logs: lastFive([1, 1, 1, 4, 4]), tipsEnabled: false }));
    expect(r.primary).toBeNull();
    expect(r.extra).toBeNull();
  });
});

describe("rotation", () => {
  it("is the same all day for the same logs", () => {
    const logs = lastFive([4, 4, 4, 4, 4]);
    expect(coach(base({ logs }))).toEqual(coach(base({ logs })));
  });

  it("changes from one day to the next", () => {
    const picks = new Set<string>();
    for (let k = 0; k < 10; k++) {
      const now = new Date(NOW.getTime() + k * 86_400_000);
      picks.add(coach(base({ now, logs: [] })).primary!.id);
    }
    expect(picks.size).toBeGreaterThan(1);
  });

  it("skips what was shown in the last 14 days", () => {
    const first = coach(base({})).primary!.id;
    const next = coach(base({ seen: [{ id: first, day: day(1) }] })).primary!.id;
    expect(next).not.toBe(first);
    const old = coach(base({ seen: [{ id: first, day: day(15) }] })).primary!.id;
    expect(old).toBe(first);
  });

  it("keeps today's tip after it has been recorded as seen today", () => {
    const first = coach(base({})).primary!.id;
    const again = coach(base({ seen: [{ id: first, day: TODAY }] })).primary!.id;
    expect(again).toBe(first);
  });

  it("starts over rather than going quiet when everything was seen", () => {
    const seen = TIPS.map((t) => ({ id: t.id, day: day(2) }));
    expect(coach(base({ seen })).primary).not.toBeNull();
  });

  it("offers a different tip for 'Another tip'", () => {
    const r = coach(base({}));
    expect(r.extra).not.toBeNull();
    expect(r.extra!.tip.id).not.toBe(r.primary!.id);
  });
});

describe("factor insight", () => {
  // 16 consecutive days, a log a day: coffee on the odd ones, softer (5 vs 4).
  const days = (withDays: number, withoutDays: number) => {
    const out: PoopLog[] = [];
    for (let i = 0; i < withDays + withoutDays; i++) {
      const coffee = i % 2 === 1 && Math.floor(i / 2) < withDays;
      out.push(log(i + 1, coffee ? 5 : 4, { factors: coffee ? ["coffee"] : [] }));
    }
    // Keep the last five out of "steady" so the insight isn't behind a pattern tip.
    out.push(log(0, 6));
    return out;
  };

  it("speaks once there are 8 days with and 8 without", () => {
    const r = coach(base({ logs: days(8, 9) }));
    expect(r.primary?.id).toBe("insight-coffee");
    expect(r.primary?.text).toBe("On days you logged coffee, your logs were softer on average.");
  });

  it("stays silent with 7 days with the factor", () => {
    const r = coach(base({ logs: days(7, 10) }));
    expect(r.primary?.id).not.toBe("insight-coffee");
  });
});

describe("reminders", () => {
  const habit = (h: number, m: number, count = 8) => Array.from({ length: count }, (_, k) => log(k + 1, 4, { h, m }));
  const at = (h: number, m: number) => new Date(Date.UTC(2026, 9, 9, h, m));

  it("fires near a steady time", () => {
    const r = coach(base({ logs: habit(8, 0), now: at(8, 20) }));
    expect(r.reminder?.text).toBe(REMINDER_TEXT);
  });

  it("is quiet away from that time", () => {
    expect(coach(base({ logs: habit(8, 0), now: at(14, 0) })).reminder).toBeNull();
  });

  it("works across midnight (23:50 and 00:10 are the same habit)", () => {
    const logs = Array.from({ length: 8 }, (_, k) => log(k + 1, 4, k % 2 ? { h: 23, m: 50 } : { h: 0, m: 10 }));
    expect(circularMedian([23 * 60 + 50, 10, 23 * 60 + 50, 10]) % 1440).toSatisfy((m: number) => m === 10 || m === 1430);
    expect(coach(base({ logs, now: at(23, 55) })).reminder).not.toBeNull();
    expect(coach(base({ logs, now: at(0, 5) })).reminder).not.toBeNull();
    expect(coach(base({ logs, now: at(12, 0) })).reminder).toBeNull();
  });

  it("shows nothing for an irregular pattern", () => {
    const hours = [2, 8, 14, 20, 5, 11, 17, 23];
    const logs = hours.map((h, k) => log(k + 1, 4, { h }));
    expect(coach(base({ logs, now: at(8, 0) })).reminder).toBeNull();
  });

  it("needs at least seven logs in 30 days", () => {
    expect(coach(base({ logs: habit(8, 0, 6), now: at(8, 10) })).reminder).toBeNull();
  });

  it("is suppressed by a log today, a quiet day today, or a dismissal today", () => {
    const logs = habit(8, 0);
    const now = at(8, 10);
    expect(coach(base({ logs: [...logs, log(0, 4, { h: 7 })], now })).reminder).toBeNull();
    expect(coach(base({ logs, now, quietDays: [TODAY] })).reminder).toBeNull();
    expect(coach(base({ logs, now, reminderDismissedDay: TODAY })).reminder).toBeNull();
    expect(coach(base({ logs, now, reminderDismissedDay: day(1) })).reminder).not.toBeNull();
  });

  it("is off when Reminders is off, with Tips untouched", () => {
    const r = coach(base({ logs: habit(8, 0), now: at(8, 10), remindersEnabled: false }));
    expect(r.reminder).toBeNull();
    expect(r.primary).not.toBeNull();
  });

  it("still gives the reminder with Tips off", () => {
    const r = coach(base({ logs: habit(8, 0), now: at(8, 10), tipsEnabled: false }));
    expect(r.primary).toBeNull();
    expect(r.reminder).not.toBeNull();
  });
});

describe("time zones", () => {
  const TORONTO = "America/Toronto";
  const local = (dayKey: string, h: number, m: number) =>
    new Date(zonedMidnight(dayKey, TORONTO).getTime() + (h * 60 + m) * 60_000);

  it("reads the wall clock through a clock change", () => {
    // DST ended in Toronto on 2026-11-01. 08:00 local before and after it is
    // the same habit even though the UTC time moves an hour.
    const logs = ["2026-10-24", "2026-10-26", "2026-10-28", "2026-10-30", "2026-11-01", "2026-11-02", "2026-11-03"]
      .map((d, k) => ({ ...log(0, 4), id: `dst${k}`, logged_at: local(d, 8, 0).toISOString() }));
    const now = local("2026-11-04", 8, 10);
    expect(minutesOfDay(new Date(logs[0].logged_at), TORONTO)).toBe(480);
    expect(minutesOfDay(new Date(logs[6].logged_at), TORONTO)).toBe(480);
    const r = coach(base({ logs, now, tz: TORONTO }));
    expect(r.reminder).not.toBeNull();
  });

  it("decides 'today' by the user's own zone", () => {
    // Habit at 11:00 in Tokyo (02:00Z). At 2026-10-09 02:00Z it is Oct 9 in
    // Tokyo but still the evening of Oct 8 in Toronto.
    const logs = Array.from({ length: 8 }, (_, k) => log(k + 1, 4, { h: 2, m: 0 }));
    const now = new Date(Date.UTC(2026, 9, 9, 2, 0));
    const input = { logs, now, quietDays: ["2026-10-09"] };
    // Tokyo: today is Oct 9, which is marked quiet -> no reminder.
    expect(coach(base({ ...input, tz: "Asia/Tokyo" })).reminder).toBeNull();
    // Toronto: today is Oct 8, nothing marked, and it is the habit's time.
    expect(coach(base({ ...input, tz: TORONTO })).reminder).not.toBeNull();
  });

  it("falls back to UTC for an unknown zone instead of throwing", () => {
    expect(() => coach(base({ tz: "Not/AZone" }))).not.toThrow();
  });
});

describe("clock helpers", () => {
  it("measures distance round the clock", () => {
    expect(circularDistance(23 * 60 + 50, 10)).toBe(20);
    expect(circularDistance(0, 720)).toBe(720);
    expect(circularDistance(100, 100)).toBe(0);
  });
});

describe("copy rules for everything the coach writes", () => {
  const banned = [
    "laxative", "softener", "detox", "cleanse", "flush", "supplement", "magnesium", "probiotic",
    "diagnos", "cure", "treat", "calorie", "weight", "fasting", "constipated", "ibs", "empty yourself",
  ];
  const generated = (): string[] => {
    const out = [REMINDER_TEXT];
    const scenarios: Partial<CoachInput>[] = [
      { logs: lastFive([1, 2, 1, 4, 4]) },
      { logs: lastFive([6, 7, 6, 4, 4]) },
      { logs: lastFive([3, 4, 5, 4, 3]) },
      { logs: Array.from({ length: 8 }, (_, k) => log(6 + k * 3, 4)) },
      { logs: [] },
    ];
    for (const s of scenarios) {
      const r = coach(base(s));
      out.push(r.why, r.primary?.text ?? "", r.extra?.why ?? "", r.extra?.tip.text ?? "");
    }
    const insight = coach(
      base({
        logs: [
          ...Array.from({ length: 16 }, (_, i) => log(i + 1, i % 2 ? 5 : 4, { factors: i % 2 ? ["coffee"] : [] })),
          log(0, 6),
        ],
      }),
    );
    out.push(insight.primary?.text ?? "", insight.why);
    return out.filter(Boolean);
  };

  it("avoids banned words, diagnosing language and blame", () => {
    for (const text of generated()) {
      const lower = text.toLowerCase();
      for (const w of banned) expect(lower, text).not.toContain(w);
      expect(text).not.toMatch(/\byou (have|are)\b/i);
      expect(text).not.toMatch(/should have|overdue|late\b/i);
    }
  });

  it("claims correlation, never cause", () => {
    for (const text of generated().filter((t) => t.startsWith("On days you logged"))) {
      expect(text).not.toMatch(/\b(cause|because of|makes you|leads to)\b/i);
      expect(text).toMatch(/on average\.$/);
    }
  });
});
