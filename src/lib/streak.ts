// Streak badges to aim for.
export interface Milestone {
  days: number;
  name: string;
}

export const MILESTONES: Milestone[] = [
  { days: 3, name: "Sprout" },
  { days: 7, name: "Pumpkin Patch" },
  { days: 14, name: "Stardrop" },
  { days: 30, name: "Golden Harvest" },
  { days: 60, name: "Farm Legend" },
  { days: 100, name: "Valley Hero" },
];

/** The next badge to earn, the last one earned, and progress between them. */
export function milestoneProgress(streak: number) {
  const next = MILESTONES.find((m) => m.days > streak) ?? null;
  const earned = [...MILESTONES].reverse().find((m) => m.days <= streak) ?? null;
  const from = earned?.days ?? 0;
  const to = next?.days ?? from;
  return {
    next,
    earned,
    remaining: next ? next.days - streak : 0,
    /** Steps completed / total between the previous badge and the next. */
    done: streak - from,
    total: to - from,
  };
}
