"use client";

// Lenis smooth scrolling, driven by GSAP's ticker so scrolling and animations
// update on the same frame. Skipped when someone prefers reduced motion.
// Put data-lenis-prevent on anything that should scroll natively.
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      // Ease-out-expo: fast start, soft landing.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Touch keeps native momentum (feels right on phones).
      syncTouch: false,
    });

    // GSAP ticker passes seconds; Lenis wants milliseconds.
    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
