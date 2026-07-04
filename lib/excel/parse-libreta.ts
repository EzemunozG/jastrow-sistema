// Parser de "Libreta del Campo" — portado de doParseWithSheetJS en
// index_10.html:1546-1623. Mapeo posicional de columnas ya usado en producción:
// col0=fecha, col1=cp, col2=finca, col3=matrícula, col4=despacho, col5=kg,
// col6=camión#, col7=hora, col8=obs.
import * as XLSX from "xlsx";
import { parseFlexibleDate, sniffHeaderRow, type ParseResult } from "./parse-common";

export type LibretaRow = {
  cp: number;
  fecha: string;
  camion: string;
  obs: string;
};

export type BajaCandidata = {
  cp: number;
  fecha: string;
  motivo: string;
  obs: string;
};

export function parseLibretaWorkbook(data: ArrayBuffer): {
  libreta: ParseResult<LibretaRow>;
  bajasCandidatas: BajaCandidata[];
} {
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
  });

  const dataStart = sniffHeaderRow(rows, ["remito", "cp"]);

  const valid: LibretaRow[] = [];
  const errors: ParseResult<LibretaRow>["errors"] = [];
  const bajasCandidatas: BajaCandidata[] = [];
  let ultimaFecha = "";

  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i];
    const cp = parseInt(String(r[1]), 10);
    if (!cp || isNaN(cp)) continue;

    const fecha = parseFlexibleDate(r[0]) || ultimaFecha;
    if (!fecha) {
      errors.push({ row: i + 1, errors: ["No se pudo determinar la fecha"] });
      continue;
    }
    ultimaFecha = fecha;

    const finca = String(r[2] ?? "").trim();
    const mat = String(r[3] ?? "").trim();
    const desp = r[4] ?? "";
    const kg = r[5] ?? null;
    const cam = r[6] ?? "";
    const hora = r[7] ?? "";
    const obs = String(r[8] ?? "").trim();

    if (obs.toUpperCase().includes("BAJA")) {
      bajasCandidatas.push({
        cp,
        fecha,
        motivo: "Camión sin carga — dar de baja",
        obs,
      });
    }

    valid.push({
      cp,
      fecha,
      camion: mat + (cam ? " / cam." + cam : ""),
      obs:
        finca +
        (desp ? " · desp." + desp : "") +
        (hora ? " · " + hora : "") +
        (kg ? " · " + kg + " kg neto" : "") +
        (obs ? " · " + obs : ""),
    });
  }

  return { libreta: { valid, errors }, bajasCandidatas };
}
