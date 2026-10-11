"use client";

// The avatar builder: a big live preview, a tab per slot, and a grid of
// choices. Shapes are shown on your own avatar so you see the real result;
// colours are plain swatches with their name underneath.
//
// Nothing is saved until Save. Leaving with changes asks first.
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import Avatar from "./Avatar";
import { FormMessage } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/PixelButton";
import { updateAvatar } from "@/app/actions/avatar";
import { defaultAvatar, randomAvatar, sameAvatar, type AvatarConfig } from "@/lib/avatar/compose";
import { AVATAR_SLOTS, SLOT_LABEL, partsFor, type AvatarPart, type AvatarSlot } from "@/lib/avatar/parts";

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";
const SELECTED = "0 -3px 0 0 #2a1b3d, 0 3px 0 0 #2a1b3d, -3px 0 0 0 #2a1b3d, 3px 0 0 0 #2a1b3d";

interface AvatarEditorProps {
  /** The avatar as it is saved now (or the default, if none is saved). */
  initial: AvatarConfig;
  userId: string;
  /** Where "Back" goes. */
  backHref?: string;
}

export default function AvatarEditor({ initial, userId, backHref = "/settings" }: Readonly<AvatarEditorProps>) {
  const [config, setConfig] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [slot, setSlot] = useState<AvatarSlot>("hair");
  const [result, setResult] = useState<{ error?: string; message?: string }>({});
  const [pending, startTransition] = useTransition();

  const fallback = defaultAvatar(userId);
  const dirty = !sameAvatar(config, saved);

  // Closing the tab or reloading with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (next: AvatarConfig) => {
    setConfig(next);
    setResult({});
  };

  const save = () =>
    startTransition(async () => {
      // Saving the default look stores "no avatar", so it stays the default.
      const res = await updateAvatar(sameAvatar(config, fallback) ? null : config);
      if (res.ok) {
        setSaved(config);
        setResult({ message: "Saved! Looking good." });
      } else {
        setResult({ error: res.error });
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <section className="pix-card flex flex-col items-center gap-3" aria-label="Preview">
        <Avatar config={config} size={160} title="Your avatar" />
        <div className="grid w-full grid-cols-2 gap-2">
          <button type="button" onClick={() => change(randomAvatar())} className="pix-btn pix-btn--lilac pix-btn--sm">
            Randomise
          </button>
          <button
            type="button"
            onClick={() => change(fallback)}
            disabled={sameAvatar(config, fallback)}
            className="pix-btn pix-btn--cream pix-btn--sm"
          >
            Reset
          </button>
        </div>
      </section>

      <section className="pix-card flex flex-col gap-3">
        <div role="tablist" aria-label="What to change" className="grid grid-cols-4 gap-2 px-[2px]">
          {AVATAR_SLOTS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              id={`tab-${s}`}
              aria-selected={slot === s}
              aria-controls="avatar-choices"
              onClick={() => setSlot(s)}
              className="flex min-h-[48px] items-center justify-center px-1 text-center text-[14px] leading-tight"
              style={{
                background: slot === s ? "var(--color-butter)" : "var(--color-cream-2)",
                boxShadow: slot === s ? SELECTED : OUTLINE,
                fontWeight: slot === s ? 700 : 500,
              }}
            >
              {SLOT_LABEL[s]}
            </button>
          ))}
        </div>

        <div
          id="avatar-choices"
          role="tabpanel"
          aria-labelledby={`tab-${slot}`}
          className="grid grid-cols-4 gap-2.5 px-[2px] pt-1"
        >
          {partsFor(slot).map((part) => (
            <Choice
              key={part.id}
              part={part}
              config={config}
              chosen={config[slot] === part.id}
              onPick={() => change({ ...config, [slot]: part.id })}
            />
          ))}
        </div>
      </section>

      <FormMessage error={result.error} message={dirty ? undefined : result.message} />
      <button
        type="button"
        onClick={save}
        disabled={pending || !dirty}
        aria-busy={pending}
        className={`${buttonClass("mint")} w-full`}
      >
        {pending ? "Saving…" : dirty ? "Save avatar" : "Saved"}
      </button>
      <Link
        href={backHref}
        onClick={(e) => {
          if (dirty && !window.confirm("Leave without saving your avatar?")) e.preventDefault();
        }}
        className="self-center text-[17px] text-cream underline underline-offset-4"
      >
        Back to settings
      </Link>
    </div>
  );
}

/** The first colour a colour part sets: what its swatch shows. */
const swatch = (part: AvatarPart) => Object.values(part.colors ?? {})[0] ?? "#fff8ef";

function Choice({
  part,
  config,
  chosen,
  onPick,
}: Readonly<{ part: AvatarPart; config: AvatarConfig; chosen: boolean; onPick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onPick}
      // Paid parts will show here, locked, once the shop exists.
      disabled={!part.free}
      aria-pressed={chosen}
      aria-label={part.free ? part.name : `${part.name} (not available yet)`}
      className="flex min-h-[72px] flex-col items-center justify-center gap-1 px-1 py-2"
      style={{ background: chosen ? "var(--color-mint)" : "var(--color-cream-2)", boxShadow: chosen ? SELECTED : OUTLINE }}
    >
      {part.grid ? (
        <Avatar config={{ ...config, [part.slot]: part.id }} size={48} />
      ) : (
        <span className="size-10" style={{ background: swatch(part), boxShadow: OUTLINE }} />
      )}
      <span className={`text-[12px] leading-tight ${chosen ? "font-bold" : ""}`}>{part.name}</span>
    </button>
  );
}
