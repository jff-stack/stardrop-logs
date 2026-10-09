import { Suspense } from "react";
import LogCreator from "@/components/log/LogCreator";
import LoadingCard from "@/components/ui/LoadingCard";
import PixelArt, { ICONS } from "@/components/ui/PixelArt";
import { requireUser } from "@/lib/auth";
import { getRecentLogTimes } from "@/lib/data/dashboard";

export const metadata = { title: "New log" };

export default function LogPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-10 pt-5">
      <header className="flex items-center justify-center gap-2 pt-1">
        <PixelArt grid={ICONS.stardrop} scale={4} />
        <h1 className="pix-title text-[28px] leading-none">New log</h1>
      </header>
      <Suspense fallback={<LoadingCard text="Opening the log book…" />}>
        <Gate />
      </Suspense>
    </main>
  );
}

// Signed-in only. proxy.ts already redirects, this is the real check.
// The last ~day and a half of log times lets the screen say "your 2nd today"
// (the browser decides what "today" means in the user's timezone).
async function Gate() {
  const { supabase } = await requireUser("/log");
  return <LogCreator recentTimes={await getRecentLogTimes(supabase)} />;
}
