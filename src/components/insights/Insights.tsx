"use client";

// The Insights screen: Mia's take, three headline numbers and two charts,
// with the deeper charts folded under "More charts" to keep it calm.
import MiaSprite from "@/components/mia/MiaSprite";
import { useNow } from "@/hooks/useNow";
import { demoData } from "@/lib/demo";
import { buildInsights } from "@/lib/insights";
import { averagePerDay } from "@/lib/rhythm";
import type { DashboardData } from "@/lib/types";
import LoadingCard from "@/components/ui/LoadingCard";
import WeeklyChart from "./WeeklyChart";
import DailyTrendChart from "./DailyTrendChart";
import BristolMix from "./BristolMix";
import FactorImpact from "./FactorImpact";

function Tile({ value, label, note }: Readonly<{ value: string; label: string; note?: string }>) {
  return (
    <div className="pix-card !m-0.5 flex flex-col !p-3">
      <span className="text-[30px] font-bold leading-none">{value}</span>
      <span className="mt-1 text-[14px] leading-tight">{label}</span>
      {note && <span className="mt-0.5 text-[13px] leading-tight text-plum-soft">{note}</span>}
    </div>
  );
}

function deltaNote(delta: number | null) {
  if (delta === null) return "vs prior month: —";
  if (delta === 0) return "same as last month";
  return `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)} pts vs last month`;
}

/** Normal is roughly 3 a week (0.4) to 3 a day. */
function perDayNote(n: number) {
  if (n === 0) return "last 30 days";
  if (n < 0.4) return "on the low side";
  if (n > 3) return "on the high side";
  return "in the normal range";
}

/** Mia's one-line read of the weekly trend. */
function summary(rateNow: number | null, delta: number | null) {
  if (rateNow === null) return "Log a few days and your charts will sprout here!";
  if (delta !== null && delta >= 10) return "Your prize rate is climbing. Whatever you're doing, keep it up!";
  if (delta !== null && delta <= -10) return "A bumpier month. Check 'What seems to help' for clues!";
  return "Nice and steady. Consistency is the secret ingredient!";
}

export default function Insights({ data }: Readonly<{ data: DashboardData }>) {
  const now = useNow();
  if (!now) return <LoadingCard text="Counting the harvest…" />;

  const source = data.isDemo ? demoData(now) : { logs: data.logs, quietDays: data.quietDays };
  const ins = buildInsights(source.logs, source.quietDays, now);
  const k = ins.kpis;
  const perDay = averagePerDay(source.logs, now, 30);

  return (
    <>
      {data.isDemo && (
        <p className="pix-card pix-card--lilac !py-2 text-center text-[16px]">
          ✦ Sample data. Your own charts grow as you log ✦
        </p>
      )}

      {/* Mia's summary */}
      <section className="pix-card flex items-center gap-3">
        <MiaSprite state="inspect" scale={3} />
        <p className="text-[17px] leading-snug">{summary(k.prizeRate30, k.prizeDelta)}</p>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <Tile
          value={k.prizeRate30 === null ? "—" : `${k.prizeRate30}%`}
          label="prize rate"
          note={deltaNote(k.prizeDelta)}
        />
        <Tile value={`${perDay}`} label="a day, on average" note={perDayNote(perDay)} />
        <Tile value={`${k.movementDays30}`} label="days with a movement" note="last 30 days" />
      </div>

      <WeeklyChart weeks={ins.weekly} />
      <FactorImpact impacts={ins.factorImpact} />

      <details className="group flex flex-col">
        <summary className="pix-card cursor-pointer list-none !py-2.5 text-center text-[17px] font-semibold">
          <span className="group-open:hidden">More charts ▾</span>
          <span className="hidden group-open:inline">Fewer charts ▴</span>
        </summary>
        <div className="mt-5 flex flex-col gap-5">
          <DailyTrendChart days={ins.daily} />
          <BristolMix mix={ins.mix} />
        </div>
      </details>

      <p className="px-2 text-center text-[14px] text-cream">
        Patterns, not diagnoses. If something worries you, chat with a doctor.
      </p>
    </>
  );
}
