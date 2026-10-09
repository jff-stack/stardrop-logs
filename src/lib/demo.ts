// The sample garden for signed-out visitors: eight weeks of history that
// slowly gets better, a few quiet days, and today left open. It's seeded, so
// it looks the same on every visit.
import { categoryOf } from "./bristol";
import { dayKey, daysAgo } from "./dates";
import { seededRandom } from "./random";
import type { Factor, PoopLog, StoolColor, StoolType } from "./types";

type Rand = () => number;

const GOOD: Factor[] = ["hydrated", "fiber", "movement"];
const ROUGH: Factor[] = ["stressed", "poor_sleep", "coffee", "spicy", "alcohol"];
const COLORS: StoolColor[] = ["brown", "brown", "dark_brown", "light_brown"];
const HISTORY = 55;

const pick = <T,>(rand: Rand, list: T[]) => list[Math.floor(rand() * list.length)];

/** Healthy -> 3/4. Otherwise half dry (1/2), half loose (mostly 5/6, rarely 7). */
function pickType(rand: Rand, healthy: boolean): StoolType {
  if (healthy) return rand() < 0.55 ? 4 : 3;
  if (rand() < 0.5) return rand() < 0.5 ? 1 : 2;
  if (rand() < 0.15) return 7;
  return rand() < 0.5 ? 5 : 6;
}

/** Good days lean on good habits, rough days on rough ones (with some noise). */
function pickFactors(rand: Rand, healthy: boolean): Factor[] {
  const pool = healthy ? GOOD : ROUGH;
  const factors = new Set<Factor>([pick(rand, pool)]);
  if (rand() < 0.5) factors.add(pick(rand, pool));
  if (rand() < 0.25) factors.add(pick(rand, healthy ? ROUGH : GOOD));
  return [...factors];
}

export function demoData(now = new Date()): { logs: PoopLog[]; quietDays: string[] } {
  const rand = seededRandom(1234);
  const logs: PoopLog[] = [];
  const quietDays: string[] = [];

  for (let ago = HISTORY; ago >= 1; ago--) {
    const recent = ago <= 9; // last 9 days: a clean check-in streak
    const roll = rand();
    if (ago === 13) continue; // a missed day, so the sample streak is a believable 12
    if (!recent && roll < 0.08) continue; // a missed day now and then
    if (roll < 0.16 && ago !== 1) {
      quietDays.push(dayKey(daysAgo(ago, now)));
      continue;
    }

    // Healthier as the weeks go by (35% -> 85%), and always the last 5 days.
    const healthy = ago <= 5 || rand() < 0.35 + 0.5 * (1 - ago / HISTORY);
    const type = pickType(rand, healthy);
    const factors = pickFactors(rand, healthy);
    const count = rand() < 0.15 ? 2 : 1;

    for (let n = 0; n < count; n++) {
      const d = daysAgo(ago, now);
      d.setHours(7 + Math.floor(rand() * 13), Math.floor(rand() * 60));
      logs.push({
        id: `demo-${ago}-${n}`,
        stool_type: type,
        category: categoryOf(type),
        color: pick(rand, COLORS),
        factors,
        logged_at: d.toISOString(),
        notes: ago === 1 && n === 0 ? "Felt great after my morning walk!" : null,
      });
    }
  }

  logs.sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  return { logs, quietDays };
}
