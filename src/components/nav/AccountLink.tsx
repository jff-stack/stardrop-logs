import Link from "next/link";
import Avatar from "@/components/avatar/Avatar";
import { getUser } from "@/lib/auth";
import { getAvatar } from "@/lib/data/dashboard";

// Top-right corner: your avatar and settings when signed in, "Sign in"
// otherwise. Reads the session, so it sits inside a Suspense boundary in the
// layout.
export default async function AccountLink() {
  const { supabase, user } = await getUser();
  if (!user) {
    return (
      <Link href="/login" className="pix-chip !text-[15px]" style={{ ["--face" as string]: "var(--color-butter)" }}>
        Sign in
      </Link>
    );
  }
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      // Mia's tour points here for the avatar and settings.
      data-tour="account"
      className="pix-chip !gap-2 !py-1 !text-[15px]"
      style={{ ["--face" as string]: "var(--color-cream)" }}
    >
      <Avatar config={await getAvatar(supabase, user.id)} size={24} />
      Settings
    </Link>
  );
}
