"use client";

// Links to the data export. They're plain links so the browser handles the
// download; the only reason this is a client component is to add the
// browser's timezone, which gives the CSV its local date and time columns.
import { useSyncExternalStore } from "react";
import type { ExportFormat } from "@/lib/export";

const noop = () => () => {};

/** /api/export?format=csv&tz=Europe/London (no tz until the page has loaded in the browser). */
export function useExportHref(format: ExportFormat): string {
  const zone = useSyncExternalStore(noop, () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "", () => "");
  const params = new URLSearchParams({ format });
  if (zone) params.set("tz", zone);
  return `/api/export?${params}`;
}

/** The two download buttons in Settings, each with a line on what's in it. */
export function ExportButtons() {
  const csv = useExportHref("csv");
  const json = useExportHref("json");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <a href={csv} download className="pix-btn pix-btn--lilac w-full">
          Download logs (CSV)
        </a>
        <p className="text-[15px] text-plum-soft">Every log and quiet day, one per row. Opens in Excel or Google Sheets.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <a href={json} download className="pix-btn pix-btn--cream w-full">
          Download everything (JSON)
        </a>
        <p className="text-[15px] text-plum-soft">The same logs and quiet days, plus your profile details and settings.</p>
      </div>
    </div>
  );
}

/** A small text link to the CSV, for places that only mention the export. */
export function ExportLink({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
  const href = useExportHref("csv");
  return (
    <a href={href} download className={`underline underline-offset-4 ${className}`}>
      {children}
    </a>
  );
}
