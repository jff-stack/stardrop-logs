import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Create your garden" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Start your garden"
      subtitle="Takes about a minute. Your logs stay private to you."
      footer={
        <>
          Already have a garden? <Link href="/login" className="font-bold underline underline-offset-4">Sign in</Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
