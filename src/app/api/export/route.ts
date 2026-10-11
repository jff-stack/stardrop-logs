// GET /api/export: download your own data.
//
//   /api/export               logs and quiet days as CSV (same as ?format=csv)
//   /api/export?format=json   everything in one JSON file
//   &tz=Europe/London         adds local date and time columns to the CSV
//
// Signed-in only, and every query runs as that user, so row-level security
// decides what comes back: only their own rows. What goes into the files is
// built in src/lib/export.ts.
import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import {
  buildExportCsv, buildExportJson, exportFilename, exportFormat, fetchAllPages, validTimeZone,
} from "@/lib/export";
import type { PoopLog } from "@/lib/types";

// Personal data: never let a browser or anything in between keep a copy.
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return new Response("Please sign in.", { status: 401, headers: NO_STORE });

  const params = request.nextUrl.searchParams;
  const format = exportFormat(params.get("format"));
  // A made-up timezone is ignored, not an error: the file just has no local columns.
  const timeZone = validTimeZone(params.get("tz"));

  // Every row, a page at a time. Ordered by time and then id, so two logs
  // with the same timestamp can't swap places between pages and get skipped.
  const [logs, quiet] = await Promise.all([
    fetchAllPages<PoopLog>(async (from, to) => {
      const { data, error } = await supabase
        .from("poop_logs")
        .select("id, stool_type, category, color, factors, logged_at, notes")
        .order("logged_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      return error ? null : (data as PoopLog[]);
    }),
    fetchAllPages<string>(async (from, to) => {
      const { data, error } = await supabase
        .from("quiet_days")
        .select("day")
        .order("day", { ascending: true })
        .range(from, to);
      return error ? null : (data as { day: string }[]).map((q) => q.day);
    }),
  ]);
  // Better no file than one that looks whole and isn't.
  if (!logs.complete || !quiet.complete) {
    return new Response("Export failed. Please try again.", { status: 500, headers: NO_STORE });
  }

  const now = new Date();
  const headers = { ...NO_STORE, "Content-Disposition": `attachment; filename="${exportFilename(format, now)}"` };

  if (format === "csv") {
    return new Response(buildExportCsv(logs.rows, quiet.rows, timeZone), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  // "*" so this keeps working on a database that hasn't had every migration
  // run yet. The invite code is left out: it isn't data about the person.
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const json = buildExportJson({
    now,
    logs: logs.rows,
    quietDays: quiet.rows,
    profile: {
      name: profile?.display_name ?? null,
      gender: profile?.gender ?? null,
      dob: profile?.dob ?? null,
      created_at: profile?.created_at ?? null,
      // Their own email, from their own session.
      email: user.email,
      timezone: profile?.timezone ?? null,
      share_level: profile?.share_level ?? null,
      accept_nudges: profile?.accept_nudges ?? null,
      avatar: profile?.avatar ?? null,
    },
  });
  return new Response(JSON.stringify(json, null, 2), {
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}
