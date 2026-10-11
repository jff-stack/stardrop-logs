// Builds the two data exports: a CSV of logs and quiet days, and a JSON file
// of everything the app holds about the person asking. Pure functions, so the
// route handler stays thin and all of this can be tested.
//
// Only the caller's own data ever goes in. Friends, requests and nudges are
// left out because they're partly other people's.
import { toCsv } from "./csv";
import type { PoopLog } from "./types";

export const EXPORT_PAGE = 1000;

/**
 * Reads every row, a page at a time, until a page comes back short.
 *
 * The API returns at most 1000 rows per request and doesn't say when it has
 * cut a result off, so asking once and trusting the answer would silently
 * drop everything after row 1000.
 *
 * @param fetchPage  rows `from`..`to` inclusive, in a stable order, or null if the request failed
 * @param max        stop after this many rows (complete is then false if there were more)
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[] | null>,
  { pageSize = EXPORT_PAGE, max = Infinity }: { pageSize?: number; max?: number } = {},
): Promise<{ rows: T[]; complete: boolean }> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    if (rows.length >= max) return { rows: rows.slice(0, max), complete: false };
    const page = await fetchPage(from, from + pageSize - 1);
    if (page === null) return { rows, complete: false };
    rows.push(...page);
    if (page.length < pageSize) return { rows: rows.length > max ? rows.slice(0, max) : rows, complete: rows.length <= max };
  }
}

/** The timezone name if it's a real one, otherwise null. Never throws. */
export function validTimeZone(tz: unknown): string | null {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

/** A moment as a date and a 24-hour time in a timezone: ["2026-10-09", "08:42:00"]. */
export function localDateTime(iso: string, timeZone: string): [string, string] {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return [`${get("year")}-${get("month")}-${get("day")}`, `${get("hour")}:${get("minute")}:${get("second")}`];
}

export const EXPORT_HEADER = [
  "entry_type", "id", "logged_at", "local_date", "local_time", "stool_type", "category", "colour", "factors", "note",
];

/**
 * One row per log, then one per quiet day.
 * local_date and local_time are filled for logs only when a timezone is
 * given. A quiet day's local_date is the day itself: it was saved as a
 * calendar date in the first place.
 */
export function buildExportRows(logs: readonly PoopLog[], quietDays: readonly string[], timeZone: string | null): unknown[][] {
  return [
    ...logs.map((l) => {
      const [date, time] = timeZone ? localDateTime(l.logged_at, timeZone) : ["", ""];
      return ["log", l.id, new Date(l.logged_at).toISOString(), date, time, l.stool_type, l.category, l.color, l.factors, l.notes];
    }),
    ...quietDays.map((day) => ["quiet_day", "", "", day, "", "", "", "", "", ""]),
  ];
}

/** The CSV file's text. Starts with a byte-order mark so Excel reads it as UTF-8. */
export function buildExportCsv(logs: readonly PoopLog[], quietDays: readonly string[], timeZone: string | null): string {
  return `﻿${toCsv(EXPORT_HEADER, buildExportRows(logs, quietDays, timeZone))}`;
}

export interface ExportProfile {
  name: string | null;
  gender: string | null;
  dob: string | null;
  created_at: string | null;
  email: string;
  timezone: string | null;
  share_level: string | null;
  accept_nudges: boolean | null;
  avatar: unknown;
}

/** Everything, as one object. schema_version changes if this shape ever does. */
export function buildExportJson(input: {
  profile: ExportProfile;
  logs: readonly PoopLog[];
  quietDays: readonly string[];
  now: Date;
}) {
  return {
    schema_version: 1 as const,
    exported_at: input.now.toISOString(),
    profile: input.profile,
    logs: input.logs.map((l) => ({
      id: l.id,
      logged_at: new Date(l.logged_at).toISOString(),
      stool_type: l.stool_type,
      category: l.category,
      colour: l.color,
      factors: l.factors,
      note: l.notes,
    })),
    quiet_days: [...input.quietDays],
  };
}

export type ExportFormat = "csv" | "json";

/** Anything but "json" is CSV, so the old /api/export link keeps working. */
export const exportFormat = (value: string | null | undefined): ExportFormat => (value === "json" ? "json" : "csv");

/** stardrop-export-2026-10-09.csv */
export const exportFilename = (format: ExportFormat, now: Date) => `stardrop-export-${now.toISOString().slice(0, 10)}.${format}`;
