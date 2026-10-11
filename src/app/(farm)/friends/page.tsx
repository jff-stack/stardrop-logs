import { Suspense } from "react";
import FriendsView from "@/components/friends/FriendsView";
import LoadingCard from "@/components/ui/LoadingCard";
import { requireUser } from "@/lib/auth";
import { getFriendsData } from "@/lib/data/friends";

export const metadata = { title: "Friends" };

/** Friends: a light, opt-in peek at each other's gardens. Signed in only. */
export default function FriendsPage() {
  return (
    <Suspense fallback={<LoadingCard text="Waving at the neighbours…" />}>
      <FriendsLoader />
    </Suspense>
  );
}

// proxy.ts already redirects signed-out visitors; this is the real check.
async function FriendsLoader() {
  const { supabase, user } = await requireUser("/friends");
  return <FriendsView data={await getFriendsData(supabase, user.id)} />;
}
