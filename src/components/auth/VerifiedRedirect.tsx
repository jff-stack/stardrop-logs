"use client";

// The "Sign in" button on the Email verified page, plus a short countdown
// that goes there by itself. The button is a plain link, so it works straight
// away and without JavaScript; "Stay here" stops the countdown.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClass, pressBoing, releaseBoing } from "@/components/ui/PixelButton";

const SIGN_IN = "/login?verified=1";
const SECONDS = 5;

export default function VerifiedRedirect() {
  const router = useRouter();
  const [left, setLeft] = useState(SECONDS);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (stopped) return;
    if (left <= 0) {
      router.replace(SIGN_IN);
      return;
    }
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left, stopped, router]);

  return (
    <div className="flex flex-col gap-3">
      <Link
        href={SIGN_IN}
        onPointerDown={pressBoing}
        onPointerUp={releaseBoing}
        onPointerLeave={releaseBoing}
        className={`${buttonClass("mint")} w-full`}
      >
        Sign in
      </Link>
      {!stopped && (
        <p className="flex items-center justify-center gap-3 text-[16px] text-plum-soft">
          <span>{left > 0 ? `Taking you to sign in in ${left}…` : "Taking you to sign in…"}</span>
          {left > 0 && (
            <button type="button" onClick={() => setStopped(true)} className="underline underline-offset-4">
              Stay here
            </button>
          )}
        </p>
      )}
    </div>
  );
}
