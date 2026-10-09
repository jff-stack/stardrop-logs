"use client";

// Three chunky radio buttons. Each shows how Mia will say hello, so it's
// clear the choice only changes the greeting.
import { useState } from "react";
import { GENDER_OPTIONS, type Gender } from "@/lib/greeting";

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";
const SELECTED = "0 -3px 0 0 #2a1b3d, 0 3px 0 0 #2a1b3d, -3px 0 0 0 #2a1b3d, 3px 0 0 0 #2a1b3d";

interface GenderPickerProps {
  defaultValue?: Gender;
  errors?: string[];
}

export default function GenderPicker({ defaultValue = "other", errors }: Readonly<GenderPickerProps>) {
  const [value, setValue] = useState<Gender>(defaultValue);
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[17px] font-semibold">Gender</legend>
      <div className="grid grid-cols-3 gap-2.5 px-[3px]">
        {GENDER_OPTIONS.map((g) => {
          const on = value === g.value;
          return (
            <label
              key={g.value}
              className="flex cursor-pointer flex-col items-center gap-0.5 px-1 py-2.5 text-center has-[:focus-visible]:outline-dashed has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-butter"
              style={{ background: on ? "var(--color-pink)" : "var(--color-cream-2)", boxShadow: on ? SELECTED : OUTLINE }}
            >
              <input
                type="radio"
                name="gender"
                value={g.value}
                checked={on}
                onChange={() => setValue(g.value)}
                className="sr-only"
              />
              <span className={`text-[17px] ${on ? "font-bold" : ""}`}>{g.label}</span>
              <span className="text-[13px] leading-tight text-plum-soft">“{g.hey}”</span>
            </label>
          );
        })}
      </div>
      <span className="text-[14px] text-plum-soft">Only used for how Mia says hi. Change it anytime.</span>
      {errors?.length ? <span className="text-[15px] font-semibold text-pink-deep">{errors[0]}</span> : null}
    </fieldset>
  );
}
