import { Suspense } from "react";
import Dashboard from "@/components/dashboard/Dashboard";
import LoadingCard from "@/components/ui/LoadingCard";
import { getDashboardData } from "@/lib/data/dashboard";

/**
 * Garden (home). The dashboard reads the auth cookie, so it streams in
 * behind <Suspense> while the layout's header + tabs show instantly.
 */
export default function GardenPage() {
  return (
    <Suspense fallback={<LoadingCard text="Watering the garden…" />}>
      <DashboardLoader />
    </Suspense>
  );
}

/** Fetches the signed-in farmer's profile, logs and quiet days (RLS-scoped). */
async function DashboardLoader() {
  const data = await getDashboardData();
  return <Dashboard data={data} />;
}
