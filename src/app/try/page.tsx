import Link from "next/link";
import LogCreator from "@/components/log/LogCreator";
import MedicalNote from "@/components/legal/MedicalNote";
import PixelArt, { ICONS } from "@/components/ui/PixelArt";

export const metadata = { title: "Try a log" };

// Public demo of the log screen. Nothing typed here is saved or sent: the
// real tracker (saving, history, charts, export) needs an account, which is
// where the 18+ check and the privacy agreement happen.
// Signed-in users are sent to /log by proxy.ts.
export default function TryPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-10 pt-5">
      <header className="flex items-center justify-center gap-2 pt-1">
        <PixelArt grid={ICONS.stardrop} scale={4} />
        <h1 className="pix-title text-[28px] leading-none">Try a log</h1>
      </header>
      <p className="pix-card pix-card--lilac !py-2.5 text-center text-[16px]">
        Demo mode: nothing you pick here is saved.{" "}
        <Link href="/signup" className="font-bold underline underline-offset-4">Sign up</Link> to keep a real diary.
      </p>
      <LogCreator tryOut />
      <MedicalNote />
    </main>
  );
}
