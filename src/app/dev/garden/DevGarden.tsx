"use client";

import { useSearchParams } from "next/navigation";
import Dashboard from "@/components/dashboard/Dashboard";
import { useNow } from "@/hooks/useNow";
import { categoryOf } from "@/lib/bristol";
import { demoData } from "@/lib/demo";
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
  const logs = [...today, ...demo.logs].sort((a, b) => b.logged_at.localeCompare(a.logged_at));

  const g = params.get("gender");
  const gender = isGender(g) ? g : "female";
  return <Dashboard data={{ displayName: "Sam", gender, logs, quietDays: demo.quietDays, isDemo: false }} />;
}
