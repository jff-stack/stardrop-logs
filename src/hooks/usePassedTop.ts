"use client";

// Tells you when an element has scrolled up past the top of the screen (by
// `margin` px), and flips back when it returns. Used to float Mia on phones
// once her spot in the page has scrolled away.
import { useEffect, useState, type RefObject } from "react";

export function usePassedTop(ref: RefObject<HTMLElement | null>, enabled: boolean, margin = 48) {
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Not on screen and above the top edge (not below the bottom one).
        setPassed(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { rootMargin: `-${margin}px 0px 0px 0px` },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      setPassed(false);
    };
  }, [ref, enabled, margin]);

  return enabled && passed;
}
