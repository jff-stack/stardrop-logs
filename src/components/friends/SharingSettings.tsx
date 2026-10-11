"use client";

// The "what friends can see" choices. Used on the Friends screen, in
// Settings, and inside the first-time explainer.
import { useState, useTransition } from "react";
import { FormMessage } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/PixelButton";
import { updateSharing } from "@/app/actions/friends";
import { NEVER_SHARED, SHARE_OPTIONS, type ShareLevel } from "@/lib/friends";

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";
const SELECTED = "0 -3px 0 0 #2a1b3d, 0 3px 0 0 #2a1b3d, -3px 0 0 0 #2a1b3d, 3px 0 0 0 #2a1b3d";

interface SharingSettingsProps {
  shareLevel: ShareLevel;
  acceptNudges: boolean;
  saveLabel?: string;
  /** Called after a successful save. */
  onSaved?: () => void;
}

export default function SharingSettings({
  shareLevel,
  acceptNudges,
  saveLabel = "Save sharing",
  onSaved,
}: Readonly<SharingSettingsProps>) {
  const [level, setLevel] = useState<ShareLevel>(shareLevel);
  const [nudges, setNudges] = useState(acceptNudges);
  const [result, setResult] = useState<{ error?: string; message?: string }>({});
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await updateSharing({ share_level: level, accept_nudges: nudges });
      setResult(res.ok ? { message: res.message } : { error: res.error });
      if (res.ok) onSaved?.();
    });

  return (
    <div className="flex flex-col gap-3">
      <FormMessage error={result.error} message={result.message} />
      <fieldset className="flex flex-col gap-2.5 px-[3px]">
        <legend className="mb-2 text-[17px] font-semibold">Friends can see</legend>
        {SHARE_OPTIONS.map((o) => {
          const on = level === o.value;
          return (
            <label
              key={o.value}
              className="flex cursor-pointer flex-col px-3 py-2.5 has-[:focus-visible]:outline-dashed has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-butter"
              style={{ background: on ? "var(--color-mint)" : "var(--color-cream-2)", boxShadow: on ? SELECTED : OUTLINE }}
            >
              <input
                type="radio"
                name="share_level"
                value={o.value}
                checked={on}
                onChange={() => setLevel(o.value)}
                className="sr-only"
              />
              <span className={`text-[17px] ${on ? "font-bold" : "font-semibold"}`}>
                {o.label}
              </span>
              <span className="text-[15px]">{o.detail}</span>
            </label>
          );
        })}
      </fieldset>

      <label className="flex items-start gap-3 text-[16px]">
        <input
          type="checkbox"
          checked={nudges}
          onChange={(e) => setNudges(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[#4fc489]"
        />
        <span>Let friends send me nudges (little preset hellos, passed on by Mia).</span>
      </label>

      <p className="bg-cream-2 px-3 py-2 text-[15px]">{NEVER_SHARED}</p>

      <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={`${buttonClass("mint")} w-full`}>
        {pending ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}
