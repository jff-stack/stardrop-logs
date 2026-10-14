"use client";

import { useSearchParams } from "next/navigation";
import LogCreator from "@/components/log/LogCreator";
import { useNow } from "@/hooks/useNow";
import type { PoopLog } from "@/lib/types";

// ?old=1 is a log from last week (its time is locked); otherwise it's from
// two hours ago. Save answers "session ran out" when nobody is signed in.
export default function DevLogEdit() {
  const now = useNow();
  const old = useSearchParams().get("old") === "1";
  if (!now) return null;
  const log: PoopLog = {
    id: "00000000-0000-4000-8000-000000000001",
    stool_type: 4,
    category: "healthy",
    color: "green",
    factors: ["coffee", "hydrated"],
    logged_at: new Date(now.getTime() - (old ? 7 * 86_400_000 : 2 * 3_600_000)).toISOString(),
    notes: "Wrong colour, fix it",
  };
  return <LogCreator editing={log} />;
}
