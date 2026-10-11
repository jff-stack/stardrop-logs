import { notFound } from "next/navigation";
import DevCalendar from "./DevCalendar";

// Dev-only preview of the Insights calendar with made-up history, so it can
// be checked without an account. Recent months come from the sample data;
// older months are "fetched" from a pretend server after a short wait.
//   ?fail=1   make the older-month fetch fail, to see the retry state
// 404s in production.
export default function CalendarPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-16 pt-5">
      <h1 className="pix-title text-center text-[26px] leading-none">Calendar preview</h1>
      <DevCalendar />
    </main>
  );
}
