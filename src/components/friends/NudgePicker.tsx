"use client";

// The preset nudges, as buttons. There is no text box on purpose.
import { NUDGES, NUDGE_KINDS, type NudgeKind } from "@/lib/nudges";

interface NudgePickerProps {
  friendName: string;
  disabled: boolean;
  onPick: (kind: NudgeKind) => void;
}

export default function NudgePicker({ friendName, disabled, onPick }: Readonly<NudgePickerProps>) {
  return (
    <div role="group" aria-label={`Pick a nudge for ${friendName}`} className="mt-2.5 grid grid-cols-2 gap-2">
      {NUDGE_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          disabled={disabled}
          onClick={() => onPick(kind)}
          title={NUDGES[kind].text}
          className="pix-btn pix-btn--lilac pix-btn--sm"
        >
          {NUDGES[kind].label}
        </button>
      ))}
    </div>
  );
}
