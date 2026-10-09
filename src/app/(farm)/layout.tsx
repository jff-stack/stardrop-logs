import { Suspense } from "react";
import Link from "next/link";
import PixelArt, { ICONS } from "@/components/ui/PixelArt";
import TopNav from "@/components/nav/TopNav";
import AccountLink from "@/components/nav/AccountLink";
import MedicalNote from "@/components/legal/MedicalNote";

// Logo + tabs shared by Garden and Insights. Everything here except the
// account link is static, so it shows up instantly.
export default function FarmLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-36 pt-5">
      <header className="flex items-center justify-between gap-2 pt-1">
        <Link href="/" className="flex items-center gap-2">
          <PixelArt grid={ICONS.stardrop} scale={4} />
          <span className="pix-title text-[26px] leading-none">Stardrop Logs</span>
        </Link>
        <Suspense fallback={<span className="w-16" />}>
          <AccountLink />
        </Suspense>
      </header>
      <TopNav />
      {children}
      <MedicalNote className="mt-2" />
    </main>
  );
}
