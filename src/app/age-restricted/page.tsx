import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { MIN_AGE } from "@/lib/constants";

export const metadata = { title: "Adults only" };

export default function AgeRestrictedPage() {
  return (
    <AuthShell
      title="Sorry, not just yet!"
      subtitle={`Stardrop Logs is for adults (${MIN_AGE}+), because it stores personal health information.`}
      mia="inspect"
      footer={<Link href="/" className="underline underline-offset-4">Back to the sample garden</Link>}
    >
      <p className="text-[17px]">
        If you have questions about your digestion, a parent, school nurse or doctor is a great
        person to talk to.
      </p>
    </AuthShell>
  );
}
