import { Suspense } from "react";
import Insights from "@/components/insights/Insights";
import LoadingCard from "@/components/ui/LoadingCard";
import { getDashboardData } from "@/lib/data/dashboard";

export const metadata = { title: "Insights" };

/** Insights: charts of how things are going. Streams in behind Suspense. */
export default function InsightsPage() {
  return (
    <Suspense fallback={<LoadingCard text="Counting the harvest…" />}>
      <InsightsLoader />
    </Suspense>
  );
}

async function InsightsLoader() {
  const data = await getDashboardData();
  return <Insights data={data} />;
}
