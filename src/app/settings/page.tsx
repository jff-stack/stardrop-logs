import Link from "next/link";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import LoadingCard from "@/components/ui/LoadingCard";
import { DeleteAccountForm, ProfileForm } from "@/components/settings/SettingsForms";
import { ExportButtons } from "@/components/settings/ExportLinks";
import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { getAvatar, getProfile, getTipPrefs } from "@/lib/data/dashboard";
import TipSettings from "@/components/settings/TipSettings";
import Avatar from "@/components/avatar/Avatar";
import { getSharing } from "@/lib/data/friends";
import SharingSettings from "@/components/friends/SharingSettings";

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
  const [profile, sharing, avatar, tipPrefs] = await Promise.all([
    getProfile(supabase, user.id),
    getSharing(supabase, user.id),
    getAvatar(supabase, user.id),
    getTipPrefs(supabase, user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[16px] text-plum-soft">
        Signed in as <strong className="text-plum">{user.email}</strong>
      </p>
      <p className="-mt-3 bg-cream-2 px-3 py-2 text-[15px]">
        You stay signed in on this browser until you sign out, so there&apos;s no need to log in again.
        Other devices need their own sign-in.
      </p>

      <section className="flex items-center gap-4">
        <Avatar config={avatar} size={72} title="Your avatar" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-[16px]">Your avatar. Friends see it next to your name.</p>
          <Link href="/settings/avatar" className="pix-btn pix-btn--lilac pix-btn--sm">
            Edit avatar
          </Link>
        </div>
      </section>

      <ProfileForm displayName={profile.displayName} gender={profile.gender} />

      <section className="flex flex-col gap-2">
        <h2 className="text-[20px] font-bold">Your data</h2>
        <p className="text-[16px]">Download a copy whenever you like. It&apos;s all of it, not just recent months.</p>
        <ExportButtons />
      </section>

      {/* Hidden until 0005_friends.sql has been run. */}
      {sharing && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[20px] font-bold">Sharing</h2>
          <p className="text-[16px]">
            Only matters if you add <Link href="/friends" className="underline underline-offset-4">friends</Link>.
            Nothing is shared unless you choose it here.
          </p>
          <SharingSettings
            key={`${sharing.shareLevel}-${sharing.acceptNudges}`}
            shareLevel={sharing.shareLevel}
            acceptNudges={sharing.acceptNudges}
          />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-[20px] font-bold">Tips and reminders</h2>
        <p className="text-[16px]">
          Everyday habit ideas picked from your own logs, on this device only.{" "}
          <Link href="/tips" className="underline underline-offset-4">See all the tips</Link>.
        </p>
        <TipSettings
          key={`${tipPrefs.tipsEnabled}-${tipPrefs.remindersEnabled}`}
          tipsEnabled={tipPrefs.tipsEnabled}
          remindersEnabled={tipPrefs.remindersEnabled}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[20px] font-bold">Badges</h2>
        <p className="text-[16px]">Streak and check-in badges you&apos;ve picked up along the way.</p>
        <Link href="/badges" className="pix-btn pix-btn--butter w-full">
          See my badges
        </Link>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[20px] font-bold">Need a refresher?</h2>
        <Link href="/?tour=1" className="pix-btn pix-btn--mint w-full">
          Replay Mia&apos;s tour
        </Link>
      </section>

      <form action={signOut}>
        <button type="submit" className="pix-btn pix-btn--butter w-full">
          Sign out of this browser
        </button>
      </form>

      <section className="flex flex-col gap-2 border-t-2 border-dashed border-cream-3 pt-5">
        <h2 className="text-[20px] font-bold">Danger zone</h2>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
