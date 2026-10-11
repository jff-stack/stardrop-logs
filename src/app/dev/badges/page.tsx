import { Suspense } from "react";
import { notFound } from "next/navigation";
import DevBadges from "./DevBadges";

// Dev-only preview of the badges page with made-up history, so it can be
// checked without an account.
//   ?days=40    a check-in streak this many days long (default 9)
//   ?logs=2     logs per day (default 1)
//   ?empty=1    no history at all
// 404s in production.
export default function BadgesPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-16 pt-5">
      <h1 className="pix-title text-center text-[26px] leading-none">Badges preview</h1>
      <Suspense>
        <DevBadges />
      </Suspense>
    </main>
  );
}
