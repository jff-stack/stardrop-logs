import Link from "next/link";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";
import { safeNext } from "@/lib/validation";

export const metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell
      title="Welcome back!"
      subtitle="Mia kept the garden watered while you were away."
      footer={
        <>
          New here? <Link href="/signup" className="font-bold underline underline-offset-4">Start a garden</Link>
        </>
      }
    >
      <Suspense fallback={<LoginForm />}>
        <LoginWithNext searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

// searchParams is request data, so it lives behind its own Suspense boundary.
async function LoginWithNext({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNext(params.next) : "/";
  return <LoginForm next={next} />;
}
