"use client";

// A short message at the bottom of the screen with an Undo button. It goes
// away by itself after a few seconds.
import { useEffect } from "react";
import PixelButton from "@/components/ui/PixelButton";

interface UndoToastProps {
  text: string;
  onUndo: () => void;
  onClose: () => void;
  /** How long it stays, in ms. */
  duration?: number;
}

export default function UndoToast({ text, onUndo, onClose, duration = 6000 }: Readonly<UndoToastProps>) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    // Sits above the "New log" button.
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4">
      <div role="status" className="pix-card pointer-events-auto flex w-full max-w-sm items-center gap-3 !py-2.5">
        <p className="flex-1 text-[16px]">{text}</p>
        <PixelButton
          color="cream"
          size="sm"
          className="min-h-[44px]"
          onClick={() => {
            onUndo();
            onClose();
          }}
        >
          Undo
        </PixelButton>
      </div>
    </div>
  );
}
