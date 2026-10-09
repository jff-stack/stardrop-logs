"use client";

// Chunky button with a little squash-and-spring on tap. CSS does the
// press-down, GSAP adds the bounce.
import type { ButtonHTMLAttributes, PointerEvent } from "react";
import { gsap } from "gsap";

export type ButtonColor = "pink" | "mint" | "lilac" | "butter" | "cream";

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: ButtonColor;
  size?: "md" | "sm";
}

/** Squash on press. Exported so links styled as buttons can share it. */
export function pressBoing(e: PointerEvent<HTMLElement>) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.to(e.currentTarget, {
    scaleX: 1.06, scaleY: 0.9, duration: 0.08, ease: "power2.out", overwrite: true,
  });
}

/** Elastic overshoot on release. */
export function releaseBoing(e: PointerEvent<HTMLElement>) {
  gsap.to(e.currentTarget, {
    scaleX: 1, scaleY: 1, duration: 0.55, ease: "elastic.out(1.2, 0.4)", overwrite: true,
  });
}

export const buttonClass = (color: ButtonColor = "pink", size: "md" | "sm" = "md") =>
  `pix-btn ${color === "pink" ? "" : `pix-btn--${color}`} ${size === "sm" ? "pix-btn--sm" : ""}`;

export default function PixelButton({
  color = "pink",
  size = "md",
  className = "",
  children,
  type = "button",
  ...rest
}: Readonly<PixelButtonProps>) {
  return (
    <button
      type={type}
      className={`${buttonClass(color, size)} ${className}`}
      onPointerDown={pressBoing}
      onPointerUp={releaseBoing}
      onPointerLeave={releaseBoing}
      {...rest}
    >
      {children}
    </button>
  );
}
