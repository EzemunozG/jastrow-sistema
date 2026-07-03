// Utilidades compartidas por los parsers de Excel, portadas de
// index_10.html:1546-1574 (doParseWithSheetJS).

// Detecta la fila de encabezado buscando alguna de las `keywords` (en minúsculas)
// en las primeras 5 filas. Devuelve el índice de la primera fila de DATOS
// (la fila siguiente al encabezado encontrado), o 0 si no se detectó ninguno.
export function sniffHeaderRow(rows: unknown[][], keywords: string[]): number {
  const max = Math.min(5, rows.length);
  for (let i = 0; i < max; i++) {
    const cells = (rows[i] ?? []).map((c) => String(c).toLowerCase());
    if (
      cells.some((c) => keywords.some((keyword) => c.includes(keyword)))
    ) {
      return i + 1;
    }
  }
  return 0;
}

// Acepta Date, serial de Excel, 'YYYY-MM-DD' o 'DD/MM/YYYY'. Devuelve '' si no
// pudo interpretar el valor (index_10.html:1562-1574).
export function parseFlexibleDate(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && v > 40000 && v < 60000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

export type RowError = { row: number; errors: string[] };

export type ParseResult<T> = {
  valid: T[];
  errors: RowError[];
};
