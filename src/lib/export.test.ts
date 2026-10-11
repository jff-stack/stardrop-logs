import { describe, expect, it } from "vitest";
import {
  EXPORT_HEADER, buildExportCsv, buildExportJson, buildExportRows, exportFilename, exportFormat, fetchAllPages,
  localDateTime, validTimeZone,
} from "./export";
import type { PoopLog } from "./types";

const log = (over: Partial<PoopLog> = {}): PoopLog => ({
  id: "11111111-1111-4111-8111-111111111111",
  stool_type: 4,
  category: "healthy",
  color: "brown",
  factors: ["hydrated", "fiber"],
  logged_at: "2026-10-09T12:42:00+00:00",
  notes: null,
  ...over,
});

/** Splits CSV text into rows of cells, honouring quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [[]];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { rows.at(-1)!.push(cell); cell = ""; }
    else if (ch === "\r" && text[i + 1] === "\n") { rows.at(-1)!.push(cell); cell = ""; rows.push([]); i++; }
    else cell += ch;
  }
  rows.at(-1)!.push(cell);
  return rows;
}

describe("fetchAllPages", () => {
  /** A pretend table of `total` rows that hands out pages like the API does. */
  const table = (total: number) => {
    const calls: [number, number][] = [];
    const fetchPage = async (from: number, to: number) => {
      calls.push([from, to]);
      return Array.from({ length: Math.max(0, Math.min(to + 1, total) - from) }, (_, i) => from + i);
    };
    return { fetchPage, calls };
  };

  it("reads 2,500 rows in three pages of 1000", async () => {
    const { fetchPage, calls } = table(2500);
    const { rows, complete } = await fetchAllPages(fetchPage);
    expect(rows).toHaveLength(2500);
    expect(complete).toBe(true);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    // Every row once, in order: nothing skipped, nothing doubled.
    expect(rows).toEqual(Array.from({ length: 2500 }, (_, i) => i));
  });

  it("asks once more when the total is an exact multiple, so nothing is missed", async () => {
    const { fetchPage, calls } = table(2000);
    const { rows, complete } = await fetchAllPages(fetchPage);
    expect(rows).toHaveLength(2000);
    expect(complete).toBe(true);
    expect(calls).toHaveLength(3);
  });

  it("handles none, and fewer than a page", async () => {
    expect((await fetchAllPages(table(0).fetchPage)).rows).toEqual([]);
    expect((await fetchAllPages(table(7).fetchPage)).rows).toHaveLength(7);
  });

  it("says so when a request fails part-way, rather than passing off a partial result", async () => {
    let n = 0;
    const { rows, complete } = await fetchAllPages(async () => (n++ === 0 ? Array(1000).fill(0) : null));
    expect(rows).toHaveLength(1000);
    expect(complete).toBe(false);
  });

  it("stops at a ceiling and reports it as incomplete", async () => {
    const { fetchPage, calls } = table(10_000);
    const { rows, complete } = await fetchAllPages(fetchPage, { max: 3000 });
    expect(rows).toHaveLength(3000);
    expect(complete).toBe(false);
    expect(calls).toHaveLength(3);
    // Exactly at the ceiling is still complete.
    expect(await fetchAllPages(table(1500).fetchPage, { max: 3000 })).toMatchObject({ complete: true });
  });
});

describe("timezones", () => {
  it("accepts real timezone names and ignores everything else", () => {
    expect(validTimeZone("America/Toronto")).toBe("America/Toronto");
    expect(validTimeZone("UTC")).toBe("UTC");
    for (const bad of ["Mars/Phobos", "", null, undefined, 5, "America/Toronto; DROP TABLE", "x".repeat(80), "<script>"]) {
      expect(validTimeZone(bad)).toBeNull();
    }
  });

  it("gives the local date and time either side of a clock change", () => {
    // Toronto, 1 Nov 2026: 01:30 happens twice. 05:30Z is the first (UTC-4), 06:30Z the second (UTC-5).
    expect(localDateTime("2026-11-01T05:30:00Z", "America/Toronto")).toEqual(["2026-11-01", "01:30:00"]);
    expect(localDateTime("2026-11-01T06:30:00Z", "America/Toronto")).toEqual(["2026-11-01", "01:30:00"]);
    expect(localDateTime("2026-11-01T07:30:00Z", "America/Toronto")).toEqual(["2026-11-01", "02:30:00"]);
    // 8 Mar 2026: 02:00 to 03:00 doesn't exist. 06:59Z is 01:59, 07:00Z is 03:00.
    expect(localDateTime("2026-03-08T06:59:00Z", "America/Toronto")).toEqual(["2026-03-08", "01:59:00"]);
    expect(localDateTime("2026-03-08T07:00:00Z", "America/Toronto")).toEqual(["2026-03-08", "03:00:00"]);
    // Late evening UTC is still the day before in Toronto; midnight is 00, not 24.
    expect(localDateTime("2026-10-10T03:59:00Z", "America/Toronto")).toEqual(["2026-10-09", "23:59:00"]);
    expect(localDateTime("2026-10-10T04:00:00Z", "America/Toronto")).toEqual(["2026-10-10", "00:00:00"]);
  });
});

describe("CSV export", () => {
  it("starts with a byte-order mark and the header row", () => {
    const csv = buildExportCsv([], [], null);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe(EXPORT_HEADER.join(","));
    expect(EXPORT_HEADER).toEqual([
      "entry_type", "id", "logged_at", "local_date", "local_time", "stool_type", "category", "colour", "factors", "note",
    ]);
  });

  it("writes a log row, with local columns only when a timezone is given", () => {
    const [withTz] = buildExportRows([log()], [], "America/Toronto");
    expect(withTz).toEqual([
      "log", "11111111-1111-4111-8111-111111111111", "2026-10-09T12:42:00.000Z", "2026-10-09", "08:42:00",
      4, "healthy", "brown", ["hydrated", "fiber"], null,
    ]);
    const [without] = buildExportRows([log()], [], null);
    expect(without.slice(2, 5)).toEqual(["2026-10-09T12:42:00.000Z", "", ""]);

    const cells = parseCsv(buildExportCsv([log()], [], "America/Toronto").slice(1))[1];
    expect(cells).toEqual([
      "log", "11111111-1111-4111-8111-111111111111", "2026-10-09T12:42:00.000Z", "2026-10-09", "08:42:00",
      "4", "healthy", "brown", "hydrated; fiber", "",
    ]);
  });

  it("includes quiet days as their own rows", () => {
    const rows = parseCsv(buildExportCsv([log()], ["2026-10-07", "2026-10-08"], null).slice(1));
    expect(rows).toHaveLength(4);
    expect(rows[2]).toEqual(["quiet_day", "", "", "2026-10-07", "", "", "", "", "", ""]);
    expect(rows[3][0]).toBe("quiet_day");
    expect(rows.every((r) => r.length === EXPORT_HEADER.length)).toBe(true);
  });

  it("keeps commas, quotes, line breaks and unicode in notes intact", () => {
    const notes = ['after coffee, felt fine', 'she said "ok"', "line one\nline two", "crêpe 🥞 と お茶", "tab\there"];
    const csv = buildExportCsv(notes.map((n, i) => log({ id: `id-${i}`, notes: n })), [], null);
    const rows = parseCsv(csv.slice(1));
    expect(rows.slice(1).map((r) => r[9])).toEqual(notes);
    // Still one record per log, even though a note contains a line break.
    expect(rows).toHaveLength(notes.length + 1);
  });

  it("stops notes being run as formulas by a spreadsheet", () => {
    const risky = ["=HYPERLINK(\"http://evil\",\"click\")", "+1+1", "-2+3", "@SUM(A1:A9)", "\t=1+1", "\r=1+1"];
    const rows = parseCsv(buildExportCsv(risky.map((n) => log({ notes: n })), [], null).slice(1)).slice(1);
    for (const [i, r] of rows.entries()) {
      expect(r[9].startsWith("'"), risky[i]).toBe(true);
      expect(r[9].slice(1)).toBe(risky[i]);
    }
    // Ordinary notes are left exactly as written.
    expect(parseCsv(buildExportCsv([log({ notes: "a = b" })], [], null).slice(1))[1][9]).toBe("a = b");
  });

  it("exports every one of 2,500 logs", async () => {
    const all = Array.from({ length: 2500 }, (_, i) => log({ id: `log-${i}`, logged_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() }));
    const { rows } = await fetchAllPages(async (from, to) => all.slice(from, to + 1));
    const csv = parseCsv(buildExportCsv(rows, [], null).slice(1));
    expect(csv).toHaveLength(2501);
    expect(new Set(csv.slice(1).map((r) => r[1])).size).toBe(2500);
  });
});

describe("JSON export", () => {
  const profile = {
    name: "Sam", gender: "other", dob: "1995-04-12", created_at: "2026-01-02T03:04:05Z", email: "sam@example.com",
    timezone: "America/Toronto", share_level: "off", accept_nudges: true, avatar: null,
  };

  it("has the agreed shape and version", () => {
    const out = buildExportJson({ profile, logs: [log({ notes: "hi" })], quietDays: ["2026-10-07"], now: new Date("2026-10-09T10:00:00Z") });
    expect(Object.keys(out)).toEqual(["schema_version", "exported_at", "profile", "logs", "quiet_days"]);
    expect(out.schema_version).toBe(1);
    expect(out.exported_at).toBe("2026-10-09T10:00:00.000Z");
    expect(out.profile).toMatchObject({ name: "Sam", gender: "other", dob: "1995-04-12", email: "sam@example.com" });
    expect(out.logs).toEqual([{
      id: "11111111-1111-4111-8111-111111111111", logged_at: "2026-10-09T12:42:00.000Z", stool_type: 4,
      category: "healthy", colour: "brown", factors: ["hydrated", "fiber"], note: "hi",
    }]);
    expect(out.quiet_days).toEqual(["2026-10-07"]);
  });

  it("survives a round trip through JSON text", () => {
    const out = buildExportJson({ profile, logs: [log({ notes: 'quote " and \n newline 🥞' })], quietDays: [], now: new Date() });
    expect(JSON.parse(JSON.stringify(out)).logs[0].note).toBe('quote " and \n newline 🥞');
  });

  it("holds nothing about anyone else", () => {
    const out = buildExportJson({ profile, logs: [log()], quietDays: [], now: new Date() });
    // No lists of friends, requests, nudges, blocks or mutes: only these sections.
    expect(Object.keys(out).sort()).toEqual(["exported_at", "logs", "profile", "quiet_days", "schema_version"]);
    // "accept_nudges" is the person's own setting; nothing else mentions other people.
    const text = JSON.stringify(out).replace("accept_nudges", "");
    expect(text).not.toMatch(/friend|nudge|block|mute|request/i);
  });
});

describe("format and filename", () => {
  it("defaults to CSV so the old link still works", () => {
    expect(exportFormat(null)).toBe("csv");
    expect(exportFormat("csv")).toBe("csv");
    expect(exportFormat("json")).toBe("json");
    expect(exportFormat("xml")).toBe("csv");
    expect(exportFormat("../../etc/passwd")).toBe("csv");
  });

  it("names the file with the date", () => {
    const now = new Date("2026-10-09T23:30:00Z");
    expect(exportFilename("csv", now)).toBe("stardrop-export-2026-10-09.csv");
    expect(exportFilename("json", now)).toBe("stardrop-export-2026-10-09.json");
  });
});
