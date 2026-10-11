import AuthShell from "@/components/auth/AuthShell";
import VerifiedRedirect from "@/components/auth/VerifiedRedirect";

export const metadata = { title: "Email verified" };

// Where a sign-up confirmation link ends up (see lib/confirm.ts). The link
// handler signs the visitor back out first, so the next step is signing in.
// Nothing here reads the session, so the page is fully static and looks the
// same whoever opens it.
export default function EmailVerifiedPage() {
  return (
    <AuthShell title="Email verified" subtitle="Your account is ready." mia="celebrate">
      <VerifiedRedirect />
    </AuthShell>
  );
}
