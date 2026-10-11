import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";

export const metadata = { title: "Link expired" };

// Every failed email link lands here: confirmation and password reset alike.
// The page is the same each time and shows nothing from the link itself.
export default function AuthErrorPage() {
  return (
    <AuthShell
      title="That link didn't work"
      subtitle="It may have expired or already been used."
      mia="inspect"
    >
      <div className="flex flex-col gap-3 text-[17px]">
        <Link href="/login" className="pix-btn pix-btn--mint">Sign in</Link>
        <Link href="/signup" className="pix-btn pix-btn--butter">Create an account</Link>
        <Link href="/check-email" className="pix-btn pix-btn--cream">Get a new confirmation link</Link>
        <Link href="/forgot" className="pix-btn pix-btn--cream">Send a new reset link</Link>
      </div>
    </AuthShell>
  );
}
