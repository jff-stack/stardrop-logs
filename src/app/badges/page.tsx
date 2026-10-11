import Link from "next/link";
import { Suspense } from "react";
import BadgesView from "@/components/badges/BadgesView";
import LoadingCard from "@/components/ui/LoadingCard";
import PixelArt, { ICONS } from "@/components/ui/PixelArt";
import { requireUser } from "@/lib/auth";
import { getBadgeHistory } from "@/lib/data/badges";

export const metadata = { title: "Badges" };

export default function BadgesPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-16 pt-5">
      <header className="flex items-center justify-center gap-2 pt-1">
        <PixelArt grid={ICONS.star} scale={4} />
        <h1 className="pix-title text-[28px] leading-none">Badges</h1>
      </header>
      <Suspense fallback={<LoadingCard text="Polishing your badges…" />}>
        <Loader />
      </Suspense>
      <nav className="flex justify-center gap-6 text-[17px] text-cream">
        <Link href="/" className="underline underline-offset-4">Back to the garden</Link>
        <Link href="/settings" className="underline underline-offset-4">Settings</Link>
      </nav>
    </main>
  );
}

// Signed-in only. proxy.ts already redirects, this is the real check.
// The browser works out the badges, because "which day" depends on its timezone.
async function Loader() {
  const { supabase } = await requireUser("/badges");
  const history = await getBadgeHistory(supabase);
  return <BadgesView history={history} />;
}
