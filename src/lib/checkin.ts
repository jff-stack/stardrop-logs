// The check-in streak rule, in one place. The garden (farm.ts) and the badges
// page (badges.ts) both use it, so they can never disagree.
//
//   movement or quiet  -> the run grows (a quiet day counts just as much)
//   missed             -> the run starts over
//   pending            -> today, not checked in yet: the run is left alone,
//                         so a streak never breaks while the day is still going

/** How a day went. */
export type CheckIn = "movement" | "quiet" | "missed" | "pending";

/** The streak length as of each day, oldest first. */
export function runsOf(statuses: readonly CheckIn[]): number[] {
  let run = 0;
  return statuses.map((s) => {
    if (s === "movement" || s === "quiet") run++;
    else if (s === "missed") run = 0;
    return run;
  });
}

/** Current streak (as of the last day) and the best one in the list. */
export function streaksOf(statuses: readonly CheckIn[]) {
  const runs = runsOf(statuses);
  return {
    current: runs.at(-1) ?? 0,
    best: runs.reduce((best, run) => Math.max(best, run), 0),
  };
}
