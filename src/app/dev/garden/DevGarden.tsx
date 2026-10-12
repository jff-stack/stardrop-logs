"use client";

import { useSearchParams } from "next/navigation";
import Dashboard from "@/components/dashboard/Dashboard";
import { useNow } from "@/hooks/useNow";
import { categoryOf } from "@/lib/bristol";
import { demoData } from "@/lib/demo";
import { dayKey, daysAgo } from "@/lib/dates";
import { defaultAvatar } from "@/lib/avatar/compose";
import { isGender } from "@/lib/greeting";
import type { PoopLog, StoolType } from "@/lib/types";

const TODAY: Record<string, StoolType[]> = {
  "0": [],
  "1": [4],
  "2": [4, 3],
  "4": [4, 5, 4, 3],
  rainy: [6, 6, 7],
};

export default function DevGarden() {
  const now = useNow();
  const params = useSearchParams();
  if (!now) return null;

  const types = TODAY[params.get("today") ?? "2"] ?? TODAY["2"];
  const today: PoopLog[] = types.map((t, k) => {
    // Spread out over the last few hours, oldest first.
    const d = new Date(now.getTime() - (types.length - k) * 40 * 60_000);
    return {
      id: `today-${k}`,
      stool_type: t,
      category: categoryOf(t),
      color: "brown",
      factors: k === 0 ? ["hydrated", "fiber"] : [],
      logged_at: d.toISOString(),
      notes: null,
    };
  });
  const demo = params.get("empty") === "1" ? { logs: [], quietDays: [] } : demoData(now);
  // ?gap=1 empties yesterday, to try the "Mark quiet" catch-up row.
  const yesterday = dayKey(daysAgo(1, now));
  const gap = params.get("gap") === "1";
  const logs = [...today, ...demo.logs]
    .filter((l) => !gap || dayKey(new Date(l.logged_at)) !== yesterday)
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  const quietDays = gap ? demo.quietDays.filter((d) => d !== yesterday) : demo.quietDays;

  const g = params.get("gender");
  const gender = isGender(g) ? g : "female";
  // ?nudge=1 shows a nudge from a friend in Mia's bubble.
  const nudges = params.get("nudge") === "1" ? [{ id: "dev-nudge", kind: "water", sender_name: "Bea", sender_avatar: defaultAvatar("bea") }] : [];
  return (
    <Dashboard
      data={{ displayName: "Sam", gender, logs, quietDays, isDemo: false, nudges, timezone: null,
        tipsEnabled: params.get("tips") !== "0", remindersEnabled: params.get("reminders") !== "0",
      }}
    />
  );
}
