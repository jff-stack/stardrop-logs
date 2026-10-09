import Link from "next/link";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import LoadingCard from "@/components/ui/LoadingCard";
import { DeleteAccountForm, ProfileForm } from "@/components/settings/SettingsForms";
import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/data/dashboard";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <AuthShell
      title="Settings"
      mia="idle"
      footer={<Link href="/" className="underline underline-offset-4">Back to the garden</Link>}
    >
      <Suspense fallback={<LoadingCard text="Fetching your details…" />}>
        <SettingsBody />
      </Suspense>
    </AuthShell>
  );
}

async function SettingsBody() {
  const { supabase, user } = await requireUser("/settings");
  const profile = await getProfile(supabase, user.id);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[16px] text-plum-soft">
        Signed in as <strong className="text-plum">{user.email}</strong>
      </p>

      <ProfileForm displayName={profile.displayName} gender={profile.gender} />

      <section className="flex flex-col gap-2">
        <h2 className="text-[20px] font-bold">Your data</h2>
        <p className="text-[16px]">Download every log and quiet day as a spreadsheet-friendly CSV.</p>
        {/* A plain link so the browser handles the download. */}
        <a href="/api/export" download className="pix-btn pix-btn--lilac w-full">
          Export my data
        </a>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[20px] font-bold">Need a refresher?</h2>
        <Link href="/?tour=1" className="pix-btn pix-btn--mint w-full">
          Replay Mia&apos;s tour
        </Link>
      </section>

      <form action={signOut}>
        <button type="submit" className="pix-btn pix-btn--butter w-full">
          Sign out
        </button>
      </form>

      <section className="flex flex-col gap-2 border-t-2 border-dashed border-cream-3 pt-5">
        <h2 className="text-[20px] font-bold">Danger zone</h2>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
