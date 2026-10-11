"use client";

import { useSearchParams } from "next/navigation";
import BadgesView from "@/components/badges/BadgesView";
import { useNow } from "@/hooks/useNow";
import { dayKey, daysAgo } from "@/lib/dates";

export default function DevBadges() {
  const now = useNow();
  const params = useSearchParams();
  if (!now) return null;

  const days = params.get("empty") === "1" ? 0 : Math.min(800, Number(params.get("days")) || 9);
  const perDay = Math.min(5, Number(params.get("logs")) || 1);

  const logTimes: string[] = [];
  const quietDays: string[] = [];
  for (let ago = days - 1; ago >= 0; ago--) {
    const day = daysAgo(ago, now);
    // Every fifth day is a quiet day, to show they count the same.
    if (ago % 5 === 4) {
      quietDays.push(dayKey(day));
      continue;
    }
    for (let k = 0; k < perDay; k++) logTimes.push(new Date(day.getTime() + (8 + k * 3) * 3_600_000).toISOString());
  }
  return <BadgesView history={{ logTimes, quietDays, complete: true }} />;
}
