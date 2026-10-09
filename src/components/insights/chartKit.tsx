"use client";

// Shared bits for the Insights charts.
//
// Colours (checked for contrast on the cream cards and for colour blindness):
//   PRIZE   goal marks (Bristol 3-4)
//   CONTEXT everything else worth seeing
//   MUTED   background context, always labelled
// Text stays in the plum ink colour, never the series colour.
import type { ReactNode } from "react";

export const PRIZE = "#2f9e6a";
export const CONTEXT = "#9a7ef0";
export const MUTED = "#c9bfe0";
export const GRID = "rgb(42 27 61 / 0.14)";
export const GOAL_BAND = "#d8f6e6";
export const INK = "#2a1b3d";
export const INK_SOFT = "#5a4479";

/** Card wrapper: title, one-line explanation, chart, optional legend. */
export function ChartCard({
  title,
  subtitle,
  legend,
  children,
}: Readonly<{ title: string; subtitle: string; legend?: ReactNode; children: ReactNode }>) {
  return (
    <section className="pix-card" aria-label={title}>
      <h2 className="text-[20px] font-bold leading-tight">{title}</h2>
      <p className="mb-3 text-[15px] text-plum-soft">{subtitle}</p>
      {children}
      {legend && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">{legend}</div>}
    </section>
  );
}

/** Legend swatch + label (identity never relies on colour alone). */
export function LegendItem({
  color,
  label,
  hollow = false,
}: Readonly<{ color: string; label: string; hollow?: boolean }>) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block size-3"
        style={hollow ? { boxShadow: `inset 0 0 0 2px ${color}` } : { background: color }}
      />
      {label}
    </span>
  );
}

/**
 * Tooltip bubble positioned over an SVG chart in percentage coordinates
 * (so it tracks the responsive viewBox).
 */
export function ChartTooltip({
  x,
  y,
  children,
}: Readonly<{ x: number; y: number; children: ReactNode }>) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[115%] whitespace-nowrap bg-plum px-2 py-1 text-[14px] leading-tight text-cream"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {children}
    </div>
  );
}

/** Visually hidden data table, the accessible "table view" of a chart. */
export function SrTable({
  caption,
  head,
  rows,
}: Readonly<{ caption: string; head: string[]; rows: (string | number)[][] }>) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={String(r[0])}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
