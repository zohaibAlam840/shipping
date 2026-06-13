// CSV helper that produces files Excel opens cleanly:
//  - UTF-8 BOM so accented French characters render correctly
//  - ";" separator (the default Excel expects in French locales)
//  - a "sep=;" hint line so Excel auto-detects the separator

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const lines = [
    "sep=;",
    headers.map(escapeCell).join(";"),
    ...rows.map((r) => r.map(escapeCell).join(";")),
  ];
  // BOM + CRLF line endings for maximum Excel compatibility.
  return "﻿" + lines.join("\r\n");
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** YYYY-MM-DD for filenames. */
export function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}
