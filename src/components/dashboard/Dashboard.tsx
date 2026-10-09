"use client";

// The Garden screen: Mia, today's card, streak, garden, recent logs.
// Anything that depends on the date waits for useNow() so it uses the
// user's timezone. Quiet days and deletes update optimistically.
// Brand-new farmers (no logs yet) get a short guided tour first.
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import MiaCorner from "./MiaCorner";
import TodayCard from "./TodayCard";
import StreakCard from "./StreakCard";
import Garden from "./Garden";
import LogTimeline from "./LogTimeline";
import LogFab from "./LogFab";
import Tour from "@/components/tour/Tour";
import type { MiaHandle } from "@/components/mia/MiaSprite";
import type { MiaState } from "@/lib/mia/animations";
import { useNow } from "@/hooks/useNow";
import { buildGarden, type Plot } from "@/lib/farm";
import { CROP_LABEL } from "@/lib/crops";
import { DEMO_LINES, dashboardLines } from "@/lib/dialogue";
import { demoData } from "@/lib/demo";
import { dayKey } from "@/lib/dates";
import { logsOn } from "@/lib/rhythm";
import { gardenTour, markTourSeen, tourSeen } from "@/lib/tour";
import { markQuietDay, undoQuietDay } from "@/app/actions/quiet-day";
import { deleteLog } from "@/app/actions/logs";
import { categoryOf } from "@/lib/bristol";
import type { DashboardData, PoopLog, StoolType } from "@/lib/types";

type QuietUpdate = { day: string; quiet: boolean };

const applyQuiet = (days: string[], u: QuietUpdate) =>
  u.quiet ? [...new Set([...days, u.day])] : days.filter((d) => d !== u.day);

const isDay = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** ?tried=1..7 from the /try demo, or null. */
const triedType = (s: string | null): StoolType | null =>
  s && /^[1-7]$/.test(s) ? (Number(s) as StoolType) : null;

export default function Dashboard({ data }: Readonly<{ data: DashboardData }>) {
  const now = useNow();
  const router = useRouter();
  const params = useSearchParams();
  const mia = useRef<MiaHandle>(null);

  // ?bloom=YYYY-MM-DD is set by the log screen right after saving.
  const bloomParam = params.get("bloom");
  const bloomDay = isDay(bloomParam) ? bloomParam : null;

  // Sample data is generated in the browser so it lands on local days.
  // A visitor who just tried /try sees their pick bloom today (only the type
  // is passed along, in the URL; nothing is stored).
  const tried = data.isDemo ? triedType(params.get("tried")) : null;
  const demo = data.isDemo && now ? withTried(demoData(now), tried, now) : null;
  const [hiddenIds, hideLog] = useOptimistic<string[], string>([], (ids, id) => [...ids, id]);
  const logs = (demo ? demo.logs : data.logs).filter((l) => !hiddenIds.includes(l.id));

  // In sample mode quiet-day taps just live in local state.
  const [demoQuiet, setDemoQuiet] = useState<QuietUpdate[]>([]);
  const baseQuiet = demo ? demoQuiet.reduce((days, u) => applyQuiet(days, u), demo.quietDays) : data.quietDays;
  const [quietDays, setOptimisticQuiet] = useOptimistic(baseQuiet, applyQuiet);
  const [pending, startTransition] = useTransition();

  const garden = now ? buildGarden(logs, quietDays, now) : null;
  const today = now ? logsOn(logs, now) : [];

  // Tour: on for a first visit (no logs, not seen on this device) or ?tour=1.
  const [tourClosed, setTourClosed] = useState(false);
  const tourAsked = params.get("tour") === "1";
  const showTour =
    !data.isDemo && garden !== null && !tourClosed && (tourAsked || (data.logs.length === 0 && !tourSeen()));
  const closeTour = () => {
    markTourSeen();
    setTourClosed(true);
    if (tourAsked) router.replace("/", { scroll: false });
  };

  let lines = ["…"];
  if (data.isDemo) lines = DEMO_LINES;
  else if (garden && now) lines = dashboardLines(data.displayName, data.gender, garden, logs, now);

  const [lineIdx, setLineIdx] = useState(0);
  // One-off remark (tapped plot, saved quiet day...) shown instead of the queue.
  const [aside, setAside] = useState<string | null>(null);

  let bloomLine: string | null = null;
  if (bloomDay) {
    bloomLine = tried
      ? "Look, your crop sprouted! That's the whole idea. Sign up and I'll keep your real garden growing."
      : "Look! A fresh crop just sprouted in your garden!";
  }
  const text = aside ?? bloomLine ?? lines[lineIdx % lines.length];
  let miaState: MiaState = "idle";
  if (aside) miaState = "inspect";
  else if (bloomDay) miaState = "celebrate";
  else if (lineIdx === 0) miaState = "help";

  // Tidy the URL once the bloom has played, so a refresh doesn't replay it.
  useEffect(() => {
    if (!bloomDay) return;
    const t = setTimeout(() => router.replace(tried ? `/?tried=${tried}` : "/", { scroll: false }), 3500);
    return () => clearTimeout(t);
  }, [bloomDay, router, tried]);

  const nextLine = () => {
    setAside(null);
    setLineIdx((i) => i + 1);
    if (bloomDay) router.replace(tried ? `/?tried=${tried}` : "/", { scroll: false });
  };

  const describePlot = (plot: Plot) => {
    const day = plot.isToday ? "Today" : plot.date.toLocaleDateString(undefined, { weekday: "long" });
    const logsText = plot.count === 1 ? "1 log" : `${plot.count} logs`;
    const streak = plot.streakAt > 1 ? ` Day ${plot.streakAt} of a prize streak!` : "";
    const countText = plot.count ? ` ${logsText}.` : "";
    setAside(`${day}: ${CROP_LABEL[plot.crop]}.${countText}${streak}`);
  };

  const setQuiet = (quiet: boolean) => {
    if (!now) return;
    const update = { day: dayKey(now), quiet };
    if (quiet) {
      mia.current?.burst({ kind: "sparkle", count: 8, spread: 70 });
      setAside("Quiet day saved! Your streak is safe. Rest up, farmer.");
    } else {
      setAside("Undone! Log whenever you're ready.");
    }
    if (demo) {
      setDemoQuiet((list) => [...list, update]);
      return;
    }
    startTransition(async () => {
      setOptimisticQuiet(update);
      const res = quiet ? await markQuietDay(update.day) : await undoQuietDay(update.day);
      if (!res.ok) setAside(res.error);
    });
  };

  const removeLog = (id: string) => {
    startTransition(async () => {
      hideLog(id);
      const res = await deleteLog(id);
      setAside(res.ok ? "Removed! The garden has been tidied up." : "Hmm, couldn't remove that one.");
    });
  };

  return (
    <>
      {data.isDemo && (
        <p className="pix-card pix-card--lilac !py-2 text-center text-[16px]">
          ✦ Sample garden, just for show.{" "}
          <Link href="/signup" className="font-bold underline underline-offset-4">Sign up</Link> to start your own!
        </p>
      )}

      <div data-tour="mia">
        <MiaCorner text={text} state={miaState} onNext={nextLine} miaRef={mia} />
      </div>

      {garden && now && (
        <TodayCard
          garden={garden}
          today={today}
          recent={logs}
          now={now}
          pending={pending}
          isDemo={data.isDemo}
          onQuiet={() => setQuiet(true)}
          onUndo={() => setQuiet(false)}
        />
      )}

      <StreakCard garden={garden} />

      <Garden garden={garden} onPlotTap={describePlot} bloomDay={bloomDay} />

      <LogTimeline logs={logs} now={now} onDelete={data.isDemo ? undefined : removeLog} />

      <LogFab isDemo={data.isDemo} />

      {showTour && garden && (
        <Tour
          steps={gardenTour(data.displayName, data.gender, !garden.loggedToday && !garden.quietToday)}
          onDone={closeTour}
          finishHref="/log"
          finishLabel={data.logs.length ? "Log one now" : "Log my first one"}
        />
      )}
    </>
  );
}

/** Adds the visitor's /try pick to the sample data as a log from just now. */
function withTried(demo: { logs: PoopLog[]; quietDays: string[] }, type: StoolType | null, now: Date) {
  if (!type) return demo;
  const log: PoopLog = {
    id: "tried",
    stool_type: type,
    category: categoryOf(type),
    color: "brown",
    factors: [],
    logged_at: now.toISOString(),
    notes: null,
  };
  return { ...demo, logs: [log, ...demo.logs] };
}
