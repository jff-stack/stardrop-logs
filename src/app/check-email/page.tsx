import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";

export const metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <AuthShell
      title="Check your inbox!"
      subtitle="We sent you a link to confirm your email. Tap it and your garden is ready."
      mia="celebrate"
      footer={<Link href="/login" className="underline underline-offset-4">Already confirmed? Sign in</Link>}
    >
      <p className="text-[17px]">
        Can&apos;t find it? Peek in your spam or promotions folder. It&apos;s from Stardrop Logs, with Mia waving on it.
      </p>
    </AuthShell>
  );
}
