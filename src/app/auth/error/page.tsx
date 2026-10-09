import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";

export const metadata = { title: "Link expired" };

export default function AuthErrorPage() {
  return (
    <AuthShell
      title="That link didn't work"
      subtitle="It may have expired or already been used."
      mia="inspect"
    >
      <div className="flex flex-col gap-3 text-[17px]">
        <Link href="/login" className="pix-btn pix-btn--mint">Sign in</Link>
        <Link href="/forgot" className="pix-btn pix-btn--cream">Send a new reset link</Link>
      </div>
    </AuthShell>
  );
}
