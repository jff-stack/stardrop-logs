import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { ResendForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Check your email" };

// Shown after every sign-up attempt, whether the address was new or already
// had an account. The wording has to fit both without saying which it was.
export default function CheckEmailPage() {
  return (
    <AuthShell
      title="Check your inbox!"
      subtitle="If this address is new, we sent a confirmation link. Already have an account? Sign in or reset your password."
      mia="celebrate"
    >
      <div className="grid grid-cols-2 gap-2">
        <Link href="/login" className="pix-btn pix-btn--mint">Sign in</Link>
        <Link href="/forgot" className="pix-btn pix-btn--cream">Forgot password</Link>
      </div>

      <section className="flex flex-col gap-3 border-t-2 border-dashed border-cream-3 pt-4">
        <h2 className="text-[20px] font-bold">No email yet?</h2>
        <p className="text-[17px]">
          Peek in your spam or promotions folder. It&apos;s from Stardrop Logs, with Mia waving on it.
        </p>
        <ResendForm />
      </section>
    </AuthShell>
  );
}
