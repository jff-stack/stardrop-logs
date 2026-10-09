import Link from "next/link";
import { getUser } from "@/lib/auth";

// Top-right corner: settings when signed in, "Sign in" otherwise.
// Reads the session, so it sits inside a Suspense boundary in the layout.
export default async function AccountLink() {
  const { user } = await getUser();
  return user ? (
    <Link href="/settings" aria-label="Settings" className="pix-chip !text-[15px]" style={{ ["--face" as string]: "var(--color-cream)" }}>
      Settings
    </Link>
  ) : (
    <Link href="/login" className="pix-chip !text-[15px]" style={{ ["--face" as string]: "var(--color-butter)" }}>
      Sign in
    </Link>
  );
}
