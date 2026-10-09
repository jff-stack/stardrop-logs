import type { Metadata, Viewport } from "next";
import { Pixelify_Sans } from "next/font/google";
import SmoothScroll from "@/components/providers/SmoothScroll";
import SkyScene from "@/components/scene/SkyScene";
import "./globals.css";

/**
 * Pixelify Sans: a rounded, friendly pixel font that stays readable at body
 * sizes. Self-hosted by next/font at build time (no runtime Google requests).
 */
const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pixelify",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Stardrop Logs",
    template: "%s · Stardrop Logs",
  },
  description:
    "A cozy pixel gut-health tracker. Log your day, grow a little garden, and let Mia cheer you on.",
  applicationName: "Stardrop Logs",
  // Health data app: keep it out of search indexes.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2b1d5e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={pixelify.variable}>
      <body className="min-h-dvh antialiased">
        {/* Fixed dusk-sky backdrop shared by every screen. */}
        <SkyScene />
        {/* Lenis smooth scrolling, synced to GSAP's ticker. */}
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
