"use client";

// The log screen. Everything is a tap except the optional note.
// Mia paces while you look around, then reacts to each choice.
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import MiaCorner from "@/components/dashboard/MiaCorner";
import type { MiaHandle } from "@/components/mia/MiaSprite";
import PixelArt from "@/components/ui/PixelArt";
import { buttonClass, pressBoing, releaseBoing } from "@/components/ui/PixelButton";
import { BRISTOL_LIST, CATEGORY_COLOR } from "@/lib/bristol";
import { COLOR_LIST } from "@/lib/colors";
import { FACTOR_LIST } from "@/lib/factors";
import { CROP_ART } from "@/lib/crops";
import { dayKey } from "@/lib/dates";
import { useNow } from "@/hooks/useNow";
import { NOTE_MAX } from "@/lib/constants";
import { LOG_INTRO, colorTip, factorTip, typeTip } from "@/lib/tips";
import { createLog } from "@/app/actions/logs";
import type { MiaState } from "@/lib/mia/animations";
import type { Factor, StoolCategory, StoolColor, StoolType } from "@/lib/types";

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";
const SELECTED = "0 -3px 0 0 #2a1b3d, 0 3px 0 0 #2a1b3d, -3px 0 0 0 #2a1b3d, 3px 0 0 0 #2a1b3d, 0 7px 0 0 rgb(26 14 54 / 0.35)";
const SWATCH_SELECTED = "0 -3px 0 0 #2a1b3d, 0 3px 0 0 #2a1b3d, -3px 0 0 0 #2a1b3d, 3px 0 0 0 #2a1b3d, 0 0 0 6px #ffe48a";

type When = "now" | "hour" | "morning" | "night" | "custom";

const FACTOR_ON = { good: "var(--color-mint)", watch: "var(--color-peach)" } as const;

const PLANTED_CROP: Record<StoolCategory, keyof typeof CROP_ART> = {
  healthy: "pumpkin",
  dry: "thirsty",
  loose: "soggy",
};

// Turns the "when" choice into a real timestamp.
function resolveWhen(when: When, custom: string, now: Date): Date {
  const d = new Date(now);
  switch (when) {
    case "hour":
      return new Date(now.getTime() - 60 * 60_000);
    case "morning":
      d.setHours(8, 0, 0, 0);
      return d;
    case "night":
      d.setDate(d.getDate() - 1);
      d.setHours(21, 0, 0, 0);
      return d;
    case "custom":
      return custom ? new Date(custom) : now;
    default:
      return now;
  }
}

// value for <input type="datetime-local"> in local time
function localInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DONE_TEXT: Record<StoolCategory, { title: string; body: string }> = {
  healthy: { title: "Prize crop planted!", body: "Your garden is glowing. Proud of you!" },
  dry: { title: "Planted!", body: "Give it some water today. Your garden will thank you." },
  loose: { title: "Planted!", body: "Rest up and sip fluids. Tomorrow's a new day." },
};

function Section({ n, title, children }: Readonly<{ n: number; title: string; children: React.ReactNode }>) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="pix-title flex items-center gap-2 px-1 text-[22px]">
        <span className="pix-chip !text-[15px] !text-plum" style={{ ["--face" as string]: "var(--color-butter)" }}>
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function LogCreator() {
  const router = useRouter();
  const mia = useRef<MiaHandle>(null);
  const [type, setType] = useState<StoolType | null>(null);
  const [color, setColor] = useState<StoolColor>("brown");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [when, setWhen] = useState<When>("now");
  const [custom, setCustom] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [notes, setNotes] = useState("");
  const [say, setSay] = useState(LOG_INTRO);
  const [miaState, setMiaState] = useState<MiaState>("checkin");
  const [done, setDone] = useState<StoolCategory | null>(null);
  const [pending, startTransition] = useTransition();

  const react = (text: string, state: MiaState = "inspect") => {
    setSay(text);
    setMiaState(state);
  };

  const pop = (el: HTMLElement) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(el, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: "elastic.out(1.2, 0.4)", overwrite: true });
  };

  const pickType = (t: StoolType, el: HTMLElement) => {
    setType(t);
    pop(el);
    const healthy = t === 3 || t === 4;
    react(typeTip(t), healthy ? "celebrate" : "inspect");
    if (healthy) mia.current?.burst({ kind: "heart", count: 6, spread: 60 });
  };

  const pickColor = (c: StoolColor, el: HTMLElement) => {
    setColor(c);
    pop(el);
    react(colorTip(c));
  };

  const toggleFactor = (f: Factor, el: HTMLElement) => {
    pop(el);
    if (factors.includes(f)) {
      setFactors(factors.filter((x) => x !== f));
    } else {
      setFactors([...factors, f]);
      react(factorTip(f));
    }
  };

  // null until mounted, so server and client render the same thing
  const now = useNow();
  const morningOk = !now || now.getHours() >= 8;

  const submit = () => {
    if (!type || pending) return;
    const at = resolveWhen(when, custom, new Date());
    startTransition(async () => {
      const res = await createLog({
        stool_type: type,
        color,
        factors,
        logged_at: at.toISOString(),
        notes: notes.trim() || undefined,
        local_day: dayKey(at),
      });
      if (!res.ok) {
        react(res.error, "inspect");
        return;
      }
      setDone(res.category);
      setMiaState(res.category === "healthy" ? "celebrate" : "help");
      mia.current?.burst({ kind: "mixed", count: 26, spread: 150 });
      setTimeout(() => router.push(`/?bloom=${res.day}`), 1700);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <MiaCorner text={say} state={miaState} onNext={() => react(LOG_INTRO, "checkin")} miaRef={mia} />

      <Section n={1} title="What did it look like?">
        {/* Swipeable row. data-lenis-prevent hands the swipe back to the browser. */}
        <div
          data-lenis-prevent
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 pt-1"
          role="radiogroup"
          aria-label="Bristol type"
        >
          {BRISTOL_LIST.map((b) => {
            const active = type === b.type;
            return (
              <button
                key={b.type}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={(e) => pickType(b.type, e.currentTarget)}
                className="flex w-[148px] shrink-0 snap-center cursor-pointer flex-col items-center gap-1.5 px-3 py-3 text-center"
                style={{
                  background: active ? CATEGORY_COLOR[b.category] : "var(--color-cream)",
                  boxShadow: active ? SELECTED : OUTLINE,
                  margin: 3,
                }}
              >
                <span className="text-[13px] text-plum-soft">Type {b.type}</span>
                <PixelArt grid={b.icon} scale={6} />
                <span className="text-[17px] font-bold leading-tight">{b.name}</span>
                <span className="text-[14px] leading-tight text-plum-soft">{b.description}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section n={2} title="Colour">
        <div className="pix-card grid grid-cols-4 gap-3" role="radiogroup" aria-label="Colour">
          {COLOR_LIST.map((c) => {
            const active = color === c.key;
            return (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={(e) => pickColor(c.key, e.currentTarget)}
                className="flex cursor-pointer flex-col items-center gap-1"
              >
                <span
                  className="block size-11"
                  style={{
                    background: c.hex,
                    boxShadow: active ? SWATCH_SELECTED : OUTLINE,
                  }}
                />
                <span className={`text-[13px] leading-tight ${active ? "font-bold" : ""}`}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section n={3} title="When?">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="When">
          {(
            [
              ["now", "Just now"],
              ["hour", "An hour ago"],
              ["morning", "This morning"],
              ["night", "Last night"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={when === key}
              disabled={key === "morning" && !morningOk}
              onClick={() => setWhen(key)}
              onPointerDown={pressBoing}
              onPointerUp={releaseBoing}
              onPointerLeave={releaseBoing}
              className={buttonClass(when === key ? "mint" : "cream", "sm")}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={when === "custom"}
            onClick={() => {
              setWhen("custom");
              if (!custom) setCustom(localInputValue(new Date()));
            }}
            className={`${buttonClass(when === "custom" ? "mint" : "cream", "sm")} col-span-2`}
          >
            Pick a time
          </button>
          {when === "custom" && (
            <input
              type="datetime-local"
              aria-label="Exact time"
              value={custom}
              max={now ? localInputValue(now) : undefined}
              onChange={(e) => setCustom(e.target.value)}
              className="pix-well col-span-2 px-3 py-3 text-[18px]"
            />
          )}
        </div>
      </Section>

      <Section n={4} title="Anything going on?">
        <div className="grid grid-cols-2 gap-2">
          {FACTOR_LIST.map((f) => {
            const on = factors.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={(e) => toggleFactor(f.key, e.currentTarget)}
                className="flex min-h-[52px] cursor-pointer items-center gap-2 px-3 text-left text-[17px]"
                style={{
                  background: on ? FACTOR_ON[f.tone] : "var(--color-cream)",
                  boxShadow: on ? SELECTED : OUTLINE,
                  margin: 3,
                }}
              >
                <PixelArt grid={f.icon} scale={3} />
                <span className={on ? "font-bold" : ""}>{f.label}</span>
              </button>
            );
          })}
        </div>

        {showNote ? (
          <label className="pix-card flex flex-col gap-2">
            <span className="text-[17px] font-semibold">A note, just for you</span>
            <textarea
              value={notes}
              maxLength={NOTE_MAX}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
              className="pix-well resize-none px-3 py-2 text-[17px]"
              placeholder="Anything worth remembering?"
            />
            <span className="self-end text-[13px] text-plum-soft">
              {notes.length}/{NOTE_MAX}
            </span>
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="self-start px-1 text-[17px] text-cream underline underline-offset-4"
          >
            + Add a note (optional)
          </button>
        )}
      </Section>

      {/* Sticky submit bar */}
      <div
        className="sticky z-20 flex items-center gap-2"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
      >
        <Link href="/" className={`${buttonClass("cream")} !px-4`}>
          Back
        </Link>
        <button
          type="button"
          onClick={submit}
          disabled={!type || pending}
          onPointerDown={pressBoing}
          onPointerUp={releaseBoing}
          onPointerLeave={releaseBoing}
          className={`${buttonClass("mint")} flex-1 !min-h-[60px] !text-[22px]`}
        >
          {submitLabel(pending, type !== null)}
        </button>
      </div>

      {done && <PlantedOverlay category={done} />}
    </div>
  );
}

function submitLabel(pending: boolean, ready: boolean) {
  if (pending) return "Planting…";
  return ready ? "Plant it!" : "Pick a type first";
}

function PlantedOverlay({ category }: Readonly<{ category: StoolCategory }>) {
  const text = DONE_TEXT[category];
  const crop = CROP_ART[PLANTED_CROP[category]];
  return (
    <div
      role="status"
      className="fixed inset-0 z-50 flex items-center justify-center bg-plum/45 px-6"
      ref={(el) => {
        if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        gsap.from(el.firstElementChild, { scale: 0, rotation: -8, duration: 0.6, ease: "back.out(2.4)" });
      }}
    >
      <div className="pix-card pix-card--mint flex max-w-xs flex-col items-center gap-2 text-center">
        <PixelArt grid={crop} scale={7} />
        <p className="text-[26px] font-bold">{text.title}</p>
        <p className="text-[17px]">{text.body}</p>
      </div>
    </div>
  );
}
