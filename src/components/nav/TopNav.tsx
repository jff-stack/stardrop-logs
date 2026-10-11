"use client";

// Three tabs: Garden, Insights and Friends.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass, pressBoing, releaseBoing } from "@/components/ui/PixelButton";

const TABS = [
  { href: "/", label: "Garden" },
  { href: "/insights", label: "Insights" },
  { href: "/friends", label: "Friends" },
] as const;

const TOUR_TARGET: Record<string, string | undefined> = { "/insights": "insights", "/friends": "friends" };

export default function TopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="grid grid-cols-3 gap-2">
      {TABS.map((t) => {
        // Friends has pages under it (an opened invite link).
        const active = path === t.href || (t.href !== "/" && path.startsWith(`${t.href}/`));
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            // Mia's tour points at these two tabs.
            data-tour={TOUR_TARGET[t.href]}
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
