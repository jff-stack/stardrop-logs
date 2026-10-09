"use client";

import { useFormStatus } from "react-dom";
import { buttonClass, pressBoing, releaseBoing, type ButtonColor } from "@/components/ui/PixelButton";

// Submit button that knows when its form is busy.
export default function SubmitButton({
  children,
  pendingText = "One sec…",
  color = "mint",
}: Readonly<{ children: React.ReactNode; pendingText?: string; color?: ButtonColor }>) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onPointerDown={pressBoing}
      onPointerUp={releaseBoing}
      onPointerLeave={releaseBoing}
      className={`${buttonClass(color)} w-full`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
