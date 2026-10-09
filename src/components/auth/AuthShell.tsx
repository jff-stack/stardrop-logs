// Shared frame for the sign-in style screens: logo, Mia, title, card.
import Link from "next/link";
import type { ReactNode } from "react";
import PixelArt, { ICONS } from "@/components/ui/PixelArt";
import MiaSprite from "@/components/mia/MiaSprite";
import type { MiaState } from "@/lib/mia/animations";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  mia?: MiaState;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthShell({ title, subtitle, mia = "help", children, footer }: Readonly<AuthShellProps>) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pb-16 pt-6">
      <Link href="/" className="flex items-center justify-center gap-2">
        <PixelArt grid={ICONS.stardrop} scale={4} />
        <span className="pix-title text-[28px] leading-none">Stardrop Logs</span>
      </Link>

      <div className="flex justify-center pt-2">
        <MiaSprite state={mia} scale={4} />
      </div>

      <section className="pix-card flex flex-col gap-4">
        <div>
          <h1 className="text-[26px] font-bold leading-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-[17px] text-plum-soft">{subtitle}</p>}
        </div>
        {children}
      </section>

      {footer && <div className="text-center text-[17px] text-cream">{footer}</div>}
    </main>
  );
}
