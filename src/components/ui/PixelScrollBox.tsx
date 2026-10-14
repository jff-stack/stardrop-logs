"use client";

// A scrolling box with its own pixel scroll bar that is always on screen.
//
// Phones (and macOS) hide the browser's scroll bar until you scroll, and
// ignore custom bar styling, so a long list looked like it had no end. Here the
// native bar is switched off and a bar is drawn next to the content instead:
// the same on every device, always visible, draggable, and a tap on the track
// jumps a page. Scrolling itself is still the browser's (touch flicks, wheel,
// arrow keys and Page Up/Down on the focused box all work as normal).
import { useEffect, useRef, type ReactNode } from "react";

interface PixelScrollBoxProps {
  children: ReactNode;
  /** Tailwind max-height class that decides when the box starts to scroll. */
  maxHeightClass?: string;
  /** Spoken name for the scrolling region. */
  label: string;
}

const MIN_THUMB = 28;

export default function PixelScrollBox({
  children,
  maxHeightClass = "max-h-[26rem]",
  label,
}: Readonly<PixelScrollBoxProps>) {
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = scroller.current;
    const bar = track.current;
    const handle = thumb.current;
    if (!box || !bar || !handle) return;

    // Size and place the thumb from the scroll position. Writes straight to
    // the DOM, so a scroll never re-renders anything.
    const update = () => {
      const trackH = bar.clientHeight;
      const { scrollHeight, clientHeight, scrollTop } = box;
      const room = scrollHeight - clientHeight;
      const size = room <= 0 ? trackH : Math.max(MIN_THUMB, (trackH * clientHeight) / scrollHeight);
      const top = room <= 0 ? 0 : (scrollTop / room) * (trackH - size);
      handle.style.height = `${Math.min(size, trackH)}px`;
      handle.style.transform = `translateY(${Math.max(0, top)}px)`;
    };

    update();
    box.addEventListener("scroll", update, { passive: true });
    // The list grows and shrinks (friends added, removed, cards opened).
    const observer = new ResizeObserver(update);
    observer.observe(box);
    for (const child of Array.from(box.children)) observer.observe(child);
    const mutations = new MutationObserver(update);
    mutations.observe(box, { childList: true, subtree: true });

    // Dragging the thumb: pointer capture keeps it following the finger or
    // mouse outside the bar. touch-action: none (on the thumb) stops the page
    // from scrolling underneath.
    let dragFrom: { y: number; top: number } | null = null;
    const down = (e: PointerEvent) => {
      dragFrom = { y: e.clientY, top: box.scrollTop };
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (!dragFrom) return;
      const trackH = bar.clientHeight;
      const room = box.scrollHeight - box.clientHeight;
      const travel = trackH - handle.offsetHeight;
      if (room <= 0 || travel <= 0) return;
      box.scrollTop = dragFrom.top + ((e.clientY - dragFrom.y) * room) / travel;
    };
    const up = (e: PointerEvent) => {
      dragFrom = null;
      if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
    };
    // A tap on the empty track moves a page towards it.
    const trackTap = (e: PointerEvent) => {
      if (e.target !== bar) return;
      const above = e.clientY < handle.getBoundingClientRect().top;
      box.scrollBy({ top: (above ? -1 : 1) * box.clientHeight * 0.9, behavior: "smooth" });
    };

    handle.addEventListener("pointerdown", down);
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
    bar.addEventListener("pointerdown", trackTap);
    return () => {
      box.removeEventListener("scroll", update);
      observer.disconnect();
      mutations.disconnect();
      handle.removeEventListener("pointerdown", down);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      bar.removeEventListener("pointerdown", trackTap);
    };
  }, []);

  return (
    <div className="pix-scroll my-[3px] flex">
      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label={label}
        className={`${maxHeightClass} min-w-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-dashed focus-visible:outline-3 focus-visible:outline-butter`}
      >
        {children}
      </div>
      {/* The bar. Decorative for screen readers: the region above is what they use. */}
      <div
        ref={track}
        aria-hidden
        className="relative w-[18px] shrink-0 touch-none border-l-[3px] border-plum bg-cream-3"
      >
        <div
          ref={thumb}
          className="absolute inset-x-0 top-0 cursor-grab touch-none border-[3px] border-plum bg-pink shadow-[inset_0_-3px_0_0_var(--color-pink-deep)] active:cursor-grabbing"
        />
      </div>
    </div>
  );
}
