import { notFound } from "next/navigation";
import { Suspense } from "react";
import LogCreator from "@/components/log/LogCreator";
import MedicalNote from "@/components/legal/MedicalNote";
import LoadingCard from "@/components/ui/LoadingCard";
import PixelArt, { ICONS } from "@/components/ui/PixelArt";
import { requireUser } from "@/lib/auth";
import { getTipPrefs } from "@/lib/data/dashboard";
import { UuidSchema } from "@/lib/validation";
import type { PoopLog } from "@/lib/types";

export const metadata = { title: "Edit log" };

/** Change a log that already exists: the log screen, filled in. Signed in only. */
export default function EditLogPage({ params }: PageProps<"/log/edit/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-10 pt-5">
      <header className="flex items-center justify-center gap-2 pt-1">
        <PixelArt grid={ICONS.stardrop} scale={4} />
        <h1 className="pix-title text-[28px] leading-none">Edit log</h1>
      </header>
      <Suspense fallback={<LoadingCard text="Finding that log…" />}>
        <Gate params={params} />
      </Suspense>
      <MedicalNote />
    </main>
  );
}

async function Gate({ params }: Pick<PageProps<"/log/edit/[id]">, "params">) {
  const { id } = await params;
  const parsed = UuidSchema.safeParse(id);
  if (!parsed.success) notFound();

  const { supabase, user } = await requireUser(`/log/edit/${parsed.data}`);
  // Row-level security means someone else's id looks exactly like one that
  // doesn't exist: both are not-found.
  const [log, prefs] = await Promise.all([
    supabase
      .from("poop_logs")
      .select("id, stool_type, category, color, factors, logged_at, notes")
      .eq("id", parsed.data)
      .maybeSingle(),
    getTipPrefs(supabase, user.id),
  ]);
  if (log.error || !log.data) notFound();

  return <LogCreator editing={log.data as PoopLog} tipsEnabled={prefs.tipsEnabled} />;
}
