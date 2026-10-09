"use client";

// Two tabs: Garden and Insights.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass, pressBoing, releaseBoing } from "@/components/ui/PixelButton";

const TABS = [
  { href: "/", label: "Garden" },
  { href: "/insights", label: "Insights" },
] as const;

export default function TopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="grid grid-cols-2 gap-2">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            onPointerDown={pressBoing}
            onPointerUp={releaseBoing}
            onPointerLeave={releaseBoing}
            className={buttonClass(active ? "mint" : "cream", "sm")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
