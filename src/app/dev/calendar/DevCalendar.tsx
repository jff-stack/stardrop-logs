"use client";

import LogCalendar from "@/components/insights/LogCalendar";
import { useNow } from "@/hooks/useNow";
import type { MonthData } from "@/app/actions/history";
import { categoryOf } from "@/lib/bristol";
import { dayKey, daysAgo } from "@/lib/dates";
import { demoData } from "@/lib/demo";
import type { PoopLog, StoolType } from "@/lib/types";

/** Pretend server: a log every other day in the asked-for stretch, two on some days. */
async function fakeMonth(from: string, to: string): Promise<MonthData> {
  await new Promise((r) => setTimeout(r, 600));
  if (new URLSearchParams(window.location.search).get("fail") === "1") {
    return { ok: false, error: "Couldn't load that month. Try again?" };
  }
  const logs: PoopLog[] = [];
  const quietDays: string[] = [];
  for (let t = Date.parse(from) + 86_400_000; t < Date.parse(to) - 86_400_000; t += 86_400_000) {
    const n = Math.floor(t / 86_400_000);
    if (n % 7 === 3) quietDays.push(dayKey(new Date(t + 12 * 3_600_000)));
    if (n % 2 !== 0) continue;
    for (let k = 0; k < (n % 6 === 0 ? 3 : 1); k++) {
      const type = ((n + k) % 7 + 1) as StoolType;
      logs.push({
        id: `fake-${n}-${k}`,
        stool_type: type,
        category: categoryOf(type),
        color: "brown",
        factors: k === 0 ? ["hydrated"] : [],
        logged_at: new Date(t + (9 + k * 4) * 3_600_000).toISOString(),
        notes: k === 2 ? "after coffee" : null,
      });
    }
  }
  return { ok: true, logs: logs.reverse(), quietDays };
}

export default function DevCalendar() {
  const now = useNow();
  if (!now) return null;
  const demo = demoData(now);
  return (
    <LogCalendar
      logs={demo.logs}
      quietDays={demo.quietDays}
      now={now}
      firstEntry={{ loggedAt: daysAgo(400, now).toISOString(), quietDay: null }}
      fetchMonth={fakeMonth}
      deleteLog={async () => {
        await new Promise((r) => setTimeout(r, 300));
        return true;
      }}
    />
  );
}
