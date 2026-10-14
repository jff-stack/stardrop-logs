// Rules for editing a log that already exists.
//
// Type, colour, habits and note can be changed on any log, however old. The
// time is different: a missed day stays missed (0007_recent_only.sql), so a
// log's time can only be moved to today or yesterday, and only a log that is
// itself from today or yesterday can be moved at all. Older logs keep their
// time and show it read-only.
import { addDays, dayKeyIn } from "./dates";

/** Can this log's time be changed? Only while its own local day is today or yesterday. */
export function canMoveLog(loggedAt: string, now: Date, timeZone: string): boolean {
  const t = new Date(loggedAt);
  if (Number.isNaN(t.getTime())) return false;
  const day = dayKeyIn(t, timeZone);
  const today = dayKeyIn(now, timeZone);
  return day === today || day === addDays(today, -1);
}
