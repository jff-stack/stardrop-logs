"use client";

// One log, as a row: type icon, name, time, colour, habits, note, and an ×
// that asks before removing. Used by the Garden's recent list and by the day
// sheet on the Insights calendar, so a log looks the same wherever it shows.
import Link from "next/link";
import PixelArt from "@/components/ui/PixelArt";
import { BRISTOL, CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/bristol";
import { COLORS } from "@/lib/colors";
import { FACTORS } from "@/lib/factors";
import { clockTime } from "@/lib/dates";
import type { PoopLog } from "@/lib/types";

const OUTLINE = "0 -2px 0 0 #2a1b3d, 0 2px 0 0 #2a1b3d, -2px 0 0 0 #2a1b3d, 2px 0 0 0 #2a1b3d";

interface LogRowProps {
  log: PoopLog;
  /** Is the "Remove this log?" question showing for this row? */
  confirming: boolean;
  onConfirmChange: (asking: boolean) => void;
  /** Omit to hide the remove button (sample garden). */
  onDelete?: (id: string) => void;
}

export default function LogRow({ log, confirming, onConfirmChange, onDelete }: Readonly<LogRowProps>) {
  const info = BRISTOL[log.stool_type];
  const color = COLORS[log.color];
  return (
    <li className="flex gap-3 py-2.5">
      <span
        className="flex h-[38px] w-[46px] shrink-0 items-center justify-center"
        style={{ background: CATEGORY_COLOR[log.category], boxShadow: OUTLINE }}
      >
        <PixelArt grid={info.icon} scale={3} title={`Type ${info.type}`} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[17px] font-bold leading-tight">{info.name}</span>
          <span className="shrink-0 text-[14px] text-plum-soft">{clockTime(log.logged_at)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-[14px] text-plum-soft">
          <span>{CATEGORY_LABEL[log.category]}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <span
              aria-hidden
              className="inline-block size-2.5"
              style={{ background: color.hex, boxShadow: "0 0 0 1.5px #2a1b3d" }}
            />
            {color.label}
          </span>
          {log.factors.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex gap-1" aria-label={log.factors.map((f) => FACTORS[f].label).join(", ")}>
                {log.factors.map((f) => (
                  <PixelArt key={f} grid={FACTORS[f].icon} scale={2} title={FACTORS[f].label} />
                ))}
              </span>
            </>
          )}
        </div>
        {log.notes && <p className="mt-1 text-[14px] italic text-plum-soft">“{log.notes}”</p>}

        {onDelete && confirming && (
          <div className="mt-2 flex items-center gap-2 text-[15px]">
            <span>Remove this log?</span>
            <button
              type="button"
              className="pix-btn pix-btn--sm !min-h-[32px] !py-1 !text-[14px]"
              onClick={() => {
                onConfirmChange(false);
                onDelete(log.id);
              }}
            >
              Remove
            </button>
            <button
              type="button"
              className="pix-btn pix-btn--cream pix-btn--sm !min-h-[32px] !py-1 !text-[14px]"
              onClick={() => onConfirmChange(false)}
            >
              Keep
            </button>
          </div>
        )}
      </div>

      {onDelete && !confirming && (
        <Link
          href={`/log/edit/${log.id}`}
          aria-label={`Edit ${info.name} log from ${clockTime(log.logged_at)}`}
          className="self-start px-1 text-[14px] leading-none text-plum-soft underline underline-offset-4 hover:text-plum"
        >
          Edit
        </Link>
      )}

      {onDelete && !confirming && (
        <button
          type="button"
          onClick={() => onConfirmChange(true)}
          aria-label={`Remove ${info.name} log from ${clockTime(log.logged_at)}`}
          className="-mr-1 self-start px-1.5 text-[18px] leading-none text-plum-soft hover:text-plum"
        >
          ×
        </button>
      )}
    </li>
  );
}
