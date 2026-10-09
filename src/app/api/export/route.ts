// GET /api/export: download all of your own logs and quiet days as CSV.
import { getUser } from "@/lib/auth";
import { BRISTOL } from "@/lib/bristol";
import { toCsv } from "@/lib/csv";
import type { PoopLog } from "@/lib/types";

const PAGE = 1000;

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return new Response("Please sign in.", { status: 401 });

  // Page through everything (RLS keeps it to this user's rows).
  const logs: PoopLog[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("poop_logs")
      .select("id, stool_type, category, color, factors, logged_at, notes")
      .order("logged_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return new Response("Export failed. Please try again.", { status: 500 });
    logs.push(...(data as PoopLog[]));
    if (data.length < PAGE) break;
  }

  const { data: quiet } = await supabase.from("quiet_days").select("day").order("day");

  const rows: unknown[][] = [
    ...logs.map((l) => [
      "log", l.logged_at, l.stool_type, BRISTOL[l.stool_type].name, l.category, l.color, l.factors, l.notes,
    ]),
    ...(quiet ?? []).map((q: { day: string }) => ["quiet_day", q.day, "", "", "", "", "", ""]),
  ];
  const csv = toCsv(
    ["kind", "when", "bristol_type", "name", "category", "color", "factors", "notes"],
    rows,
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stardrop-logs-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
