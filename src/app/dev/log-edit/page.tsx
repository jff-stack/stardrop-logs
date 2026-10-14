import { notFound } from "next/navigation";
import { Suspense } from "react";
import DevLogEdit from "./DevLogEdit";

// Dev-only preview of the edit screen with a made-up log, so it can be checked
// without an account. 404s in production.
export default function LogEditPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-10 pt-5">
      <h1 className="pix-title text-center text-[28px] leading-none">Edit log preview</h1>
      <Suspense fallback={null}>
        <DevLogEdit />
      </Suspense>
    </main>
  );
}
