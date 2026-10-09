import { Suspense } from "react";
import Welcome from "@/components/auth/Welcome";

export const metadata = { title: "Welcome" };

export default function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  return (
    <Suspense fallback={<Welcome />}>
      <WelcomeWithParams searchParams={searchParams} />
    </Suspense>
  );
}

async function WelcomeWithParams({ searchParams }: Pick<PageProps<"/welcome">, "searchParams">) {
  const params = await searchParams;
  return <Welcome bye={params.bye === "1"} />;
}
