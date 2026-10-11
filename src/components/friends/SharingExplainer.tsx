"use client";

// Shown once, the first time someone sends or accepts a friend request:
// what friends will be able to see, with a choice to make before carrying on.
// "That I checked in" is pre-selected, but nothing is shared until they save.
import SharingSettings from "./SharingSettings";
import type { ShareLevel } from "@/lib/friends";

interface SharingExplainerProps {
  acceptNudges: boolean;
  /** Runs after the choice is saved (send or accept the request). */
  onDone: () => void;
  onCancel: () => void;
}

const PRESELECTED: ShareLevel = "active";

export default function SharingExplainer({ acceptNudges, onDone, onCancel }: Readonly<SharingExplainerProps>) {
  return (
    <section className="pix-card pix-card--mint flex flex-col gap-3" aria-labelledby="sharing-explainer-title">
      <h2 id="sharing-explainer-title" className="text-[20px] font-bold">Before you add a friend</h2>
      <p className="text-[16px]">
        Friends only ever get a light peek, and you choose how much. You can change it any time in Settings.
      </p>
      <SharingSettings shareLevel={PRESELECTED} acceptNudges={acceptNudges} saveLabel="Save and carry on" onSaved={onDone} />
      <button type="button" onClick={onCancel} className="self-center text-[16px] underline underline-offset-4">
        Not now
      </button>
    </section>
  );
}
