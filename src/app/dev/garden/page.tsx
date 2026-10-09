import { Suspense } from "react";
import { notFound } from "next/navigation";
import TopNav from "@/components/nav/TopNav";
import DevGarden from "./DevGarden";

// Dev-only preview of a signed-in garden filled with sample data, so the
// Today card and the tour can be checked without an account.
//   ?today=0|1|2|4|rainy   how many logs today
//   ?tour=1                start the tour
// 404s in production.
export default function GardenPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-36 pt-5">
      <h1 className="pix-title text-center text-[26px] leading-none">Garden preview</h1>
      <TopNav />
      <Suspense>
        <DevGarden />
      </Suspense>
    </main>
  );
}
