"use client";

// Three big selects instead of a fiddly date input. Writes YYYY-MM-DD into a
// hidden "dob" field for the form.
import { useState } from "react";
import { useNow } from "@/hooks/useNow";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

export default function BirthdayPicker({ errors }: Readonly<{ errors?: string[] }>) {
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");

  // Year list is built in the browser so it never goes stale after a deploy.
  const now = useNow();
  const years = now ? Array.from({ length: 100 }, (_, i) => now.getFullYear() - i) : [];
  const dob = month && day && year ? `${year}-${pad(Number(month))}-${pad(Number(day))}` : "";
  const selectClass = "pix-well min-h-[50px] w-full px-2 text-[18px]";

  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={errors?.length ? "dob-error" : "dob-hint"}>
      <legend className="mb-1.5 text-[17px] font-semibold">Birthday</legend>
      <div className="grid grid-cols-[1.4fr_0.8fr_1fr] gap-2">
        <select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className={selectClass}>
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)} className={selectClass}>
          <option value="">Day</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <input type="hidden" name="dob" value={dob} />
      <span id="dob-hint" className="text-[14px] text-plum-soft">
        Stardrop Logs is for adults (18+). We only use this to check that.
      </span>
      {errors?.length ? (
        <span id="dob-error" className="text-[15px] font-semibold text-pink-deep">
          {errors[0]}
        </span>
      ) : null}
    </fieldset>
  );
}
