import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="No worries! We'll email you a link to pick a new one."
      mia="inspect"
      footer={<Link href="/login" className="underline underline-offset-4">Back to sign in</Link>}
    >
      <ForgotForm />
    </AuthShell>
  );
}
