// Tiny CSV writer for the data export.

// Spreadsheet apps run cells starting with = + - @ (and tab / CR) as
// formulas. Prefix those with a quote so a note like "=HYPERLINK(...)" stays
// plain text when someone opens their export.
function neutralize(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = neutralize(Array.isArray(value) ? value.join("; ") : String(value));
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
