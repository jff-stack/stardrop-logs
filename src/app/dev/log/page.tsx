import { notFound } from "next/navigation";
import LogCreator from "@/components/log/LogCreator";

// Dev-only preview of the log screen without signing in (saving won't work).
// 404s in production.
export default function LogPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-10 pt-5">
      <h1 className="pix-title text-center text-[28px] leading-none">New log</h1>
      <LogCreator />
    </main>
  );
}
