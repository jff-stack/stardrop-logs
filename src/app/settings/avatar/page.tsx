import { Suspense } from "react";
import AvatarEditor from "@/components/avatar/AvatarEditor";
import LoadingCard from "@/components/ui/LoadingCard";
import PixelArt, { ICONS } from "@/components/ui/PixelArt";
import { requireUser } from "@/lib/auth";
import { getAvatar } from "@/lib/data/dashboard";

export const metadata = { title: "Your avatar" };

export default function AvatarPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-16 pt-5">
      <header className="flex items-center justify-center gap-2 pt-1">
        <PixelArt grid={ICONS.heart} scale={4} />
        <h1 className="pix-title text-[28px] leading-none">Your avatar</h1>
      </header>
      <Suspense fallback={<LoadingCard text="Fetching your look…" />}>
        <Loader />
      </Suspense>
    </main>
  );
}

// Signed-in only. proxy.ts already redirects (it's under /settings); this is
// the real check.
async function Loader() {
  const { supabase, user } = await requireUser("/settings/avatar");
  return <AvatarEditor initial={await getAvatar(supabase, user.id)} userId={user.id} />;
}
