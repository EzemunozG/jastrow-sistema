// Parser de exportaciones del INFRARUT (datos del ingenio) — NUEVO, no existía en el
// HTML legacy (esos ~185 registros estaban a mano en el código fuente). Mapeo de
// columnas PROVISORIO basado en los campos de INFRARUTS en index_10.html:852-1002.
// Pendiente de validar contra un archivo de exportación real del ingenio — ver
// "Decisiones pendientes" en ROADMAP.md. No asumir que este mapeo es definitivo.
import * as XLSX from "xlsx";
import { z } from "zod";
import { parseFlexibleDate, sniffHeaderRow, type ParseResult } from "./parse-common";

// Orden provisorio: cp, remito, fecha, finca, veh, maq, kg_neto, kg_trash,
// kg_azucar, brix, pol, pureza, rdto
const COLS = {
  cp: 0,
  remito: 1,
  fecha: 2,
  finca: 3,
  veh: 4,
  maq: 5,
  kgNeto: 6,
  kgTrash: 7,
  kgAzucar: 8,
  brix: 9,
  pol: 10,
  pureza: 11,
  rdto: 12,
} as const;

export const infrarutRowSchema = z.object({
  cp: z.number().int().positive(),
  remito: z.number().int().positive().nullable(),
  fecha: z.string().min(1),
  fincaRaw: z.string().min(1),
  veh: z.number().int().nullable(),
  maq: z.number().int().nullable(),
  kgNeto: z.number().nonnegative(),
  kgTrash: z.number().nonnegative(),
  kgAzucar: z.number().nonnegative(),
  brix: z.number(),
  pol: z.number(),
  pureza: z.number(),
  rdto: z.number(),
});

export type InfrarutImportRow = z.infer<typeof infrarutRowSchema>;

function numOrNull(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export function parseInfrarutWorkbook(
  data: ArrayBuffer,
): ParseResult<InfrarutImportRow> {
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
  });

  const dataStart = sniffHeaderRow(rows, ["remito", "cp"]);
  const valid: InfrarutImportRow[] = [];
  const errors: ParseResult<InfrarutImportRow>["errors"] = [];

  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => c === "")) continue;

    const candidate = {
      cp: numOrNull(r[COLS.cp]),
      remito: numOrNull(r[COLS.remito]),
      fecha: parseFlexibleDate(r[COLS.fecha]),
      fincaRaw: String(r[COLS.finca] ?? "").trim(),
      veh: numOrNull(r[COLS.veh]),
      maq: numOrNull(r[COLS.maq]),
      kgNeto: numOrNull(r[COLS.kgNeto]) ?? 0,
      kgTrash: numOrNull(r[COLS.kgTrash]) ?? 0,
      kgAzucar: numOrNull(r[COLS.kgAzucar]) ?? 0,
      brix: numOrNull(r[COLS.brix]) ?? 0,
      pol: numOrNull(r[COLS.pol]) ?? 0,
      pureza: numOrNull(r[COLS.pureza]) ?? 0,
      rdto: numOrNull(r[COLS.rdto]) ?? 0,
    };

    const parsed = infrarutRowSchema.safeParse(candidate);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      errors.push({
        row: i + 1,
        errors: parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
      });
    }
  }

  return { valid, errors };
}
