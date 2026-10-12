"use client";

// The two on/off choices for tips and reminders. Same shape as the sharing
// settings: tick, then Save, with the result said plainly underneath.
import { useState, useTransition } from "react";
import { FormMessage } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/PixelButton";
import { setTipPrefs } from "@/app/actions/tips";

interface TipSettingsProps {
  tipsEnabled: boolean;
  remindersEnabled: boolean;
}

export default function TipSettings({ tipsEnabled, remindersEnabled }: Readonly<TipSettingsProps>) {
  const [tips, setTips] = useState(tipsEnabled);
  const [reminders, setReminders] = useState(remindersEnabled);
  const [result, setResult] = useState<{ error?: string; message?: string }>({});
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await setTipPrefs({ tips_enabled: tips, reminders_enabled: reminders });
      setResult(res.ok ? { message: res.message } : { error: res.error });
    });

  return (
    <div className="flex flex-col gap-3">
      <FormMessage error={result.error} message={result.message} />
      <label className="flex items-start gap-3 text-[16px]">
        <input
          type="checkbox"
          checked={tips}
          onChange={(e) => setTips(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[#4fc489]"
        />
        <span>
          <span className="block font-semibold">Tips</span>
          <span className="block text-[15px] text-plum-soft">
            A short everyday tip each day, and Mia&apos;s tip lines. Colour safety messages always stay.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-[16px]">
        <input
          type="checkbox"
          checked={reminders}
          onChange={(e) => setReminders(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[#4fc489]"
        />
        <span>
          <span className="block font-semibold">Reminders</span>
          <span className="block text-[15px] text-plum-soft">
            A quiet nudge from Mia in the app, only if you have a steady time. Never a notification.
          </span>
        </span>
      </label>
      <button type="button" onClick={save} disabled={pending} className={buttonClass("mint", "sm")}>
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
