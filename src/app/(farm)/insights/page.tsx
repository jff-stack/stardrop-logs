import { Suspense } from "react";
import Insights from "@/components/insights/Insights";
import LoadingCard from "@/components/ui/LoadingCard";
import { getUser } from "@/lib/auth";
import { getDashboardData, getFirstEntry } from "@/lib/data/dashboard";

export const metadata = { title: "Insights" };

/** Insights: a calendar of your history, then charts of how things are going. Streams in behind Suspense. */
export default function InsightsPage() {
  return (
    <Suspense fallback={<LoadingCard text="Counting the harvest…" />}>
      <InsightsLoader />
    </Suspense>
  );
}

async function InsightsLoader() {
  const { supabase, user } = await getUser();
  const [data, firstEntry] = await Promise.all([
    getDashboardData(),
    // Signed-out visitors get the locked sample, which has no calendar.
    user ? getFirstEntry(supabase) : { loggedAt: null, quietDay: null },
  ]);
  return <Insights data={data} firstEntry={firstEntry} />;
}
