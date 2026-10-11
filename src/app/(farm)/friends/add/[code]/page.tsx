import { Suspense } from "react";
import AddByLink from "@/components/friends/AddByLink";
import LoadingCard from "@/components/ui/LoadingCard";
import { requireUser } from "@/lib/auth";
import { getSharing } from "@/lib/data/friends";
import { friendPath } from "@/lib/friend-link";

export const metadata = { title: "Add a friend" };

/**
 * Where an invite link lands: /friends/add/<CODE>. It only shows a button;
 * the request is sent when that's pressed. A signed-out visitor is sent to
 * sign in and brought back here (the code is in the path so it survives).
 */
export default function AddFriendPage({ params }: PageProps<"/friends/add/[code]">) {
  return (
    <Suspense fallback={<LoadingCard text="Opening the invite…" />}>
      <Gate params={params} />
    </Suspense>
  );
}

async function Gate({ params }: Pick<PageProps<"/friends/add/[code]">, "params">) {
  const { code } = await params;
  // Only letters, digits and dashes go into the return address after sign-in.
  const safe = code.replace(/[^A-Za-z0-9-]/g, "").slice(0, 16);
  const { supabase, user } = await requireUser(friendPath(safe));
  const sharing = await getSharing(supabase, user.id);
  return (
    <AddByLink
      code={safe}
      sharingSeen={sharing?.sharingSeen ?? true}
      acceptNudges={sharing?.acceptNudges ?? true}
    />
  );
}
