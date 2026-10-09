import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/AuthForms";
import LoadingCard from "@/components/ui/LoadingCard";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "New password" };

// Reached from the reset email, which signs you in for this one step.
export default function ResetPage() {
  return (
    <AuthShell title="Pick a new password" subtitle="Something you haven't used here before.">
      <Suspense fallback={<LoadingCard text="Checking your link…" />}>
        <Gate />
      </Suspense>
    </AuthShell>
  );
}

async function Gate() {
  await requireUser("/reset");
  return <ResetForm />;
}
