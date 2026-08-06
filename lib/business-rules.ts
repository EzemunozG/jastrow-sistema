// Fórmulas y umbrales de negocio portados literalmente de index_10.html:1004-1023.
// No "mejorar" estos números sin confirmar con el usuario — son reglas de campo, no
// bugs. Ver ROADMAP.md.

// Catálogo de ingenios (espejo de la tabla `ingenios`). Constante y no query porque
// agregar un ingenio requiere migración de todos modos (default 'concepcion', FKs).
export const INGENIOS = [
  { id: "concepcion", nombre: "Ingenio Concepción" },
  { id: "trinidad", nombre: "Ingenio Trinidad" },
] as const;

export type IngenioId = (typeof INGENIOS)[number]["id"];

// Nombres de finca_id de INFRARUT, centralizados — antes cada pantalla mostraba una
// variante distinta del mismo código ("LOTE4" crudo, "LA VIRGINIA", "VIRGINIA", "Las
// 101"/"Tano"). Mismos colores que ya usaban resumen/tendencia (validados dataviz).
export const FINCAS = [
  { id: "LOTE4", nombre: "Las 101", color: "#378ADD" },
  { id: "VIRGINIA", nombre: "Tano", color: "#1D9E75" },
] as const;

export function fincaNombre(fincaId: string | null): string {
  return FINCAS.find((f) => f.id === fincaId)?.nombre ?? fincaId ?? "—";
}

// Etiquetas crudas de finca que manda el ingenio en el INFRARUT (`infraruts.finca_raw`),
// centralizadas acá para documentar qué significa cada una. El `finca_id` se deriva por
// substring en actions/infraruts.ts:resolveFincaId ("LOTE4" → LOTE4, resto → VIRGINIA),
// que solo distingue las dos fincas del INFRARUT y NO captura el lote real de la libreta.
// La atribución real a lote se hace por cps_campo.lote, no por finca_raw — este registro
// es documentación/mapeo para no perder de vista qué es cada etiqueta cuando aparecen
// nuevas. "JASTROW - LOTE 3" es la etiqueta nueva del 2026-07-30 (= PACO en la libreta).
export const FINCA_RAW_LABELS: Record<
  string,
  { fincaId: "LOTE4" | "VIRGINIA"; lote?: string; nota?: string }
> = {
  "JASTROW - LOTE4": { fincaId: "LOTE4", lote: "LAS 101" },
  "JASTROW - LA VIRGINIA": { fincaId: "VIRGINIA", lote: "TANO" },
  "JASTROW - LOTE 3": {
    fincaId: "VIRGINIA",
    lote: "PACO",
    nota: "Concepción; en la libreta es PACO",
  },
  "JASTROW - FRAU": { fincaId: "VIRGINIA", lote: "FRAU", nota: "Trinidad" },
  "JASTROW - PILOT": { fincaId: "VIRGINIA", lote: "PILOT", nota: "Trinidad" },
};

export type InfrarutRow = {
  cp: number;
  ingenio_id: string; // 'concepcion' | 'trinidad' — el cp es correlativo POR ingenio
  remito: number | null;
  // YYYY-MM-DD, o null = el ingenio confirmó el viaje pero la fecha de salida
  // todavía no se transcribió de la libreta física (ver la migración
  // 20260806000000_infraruts_fecha_nullable.sql). REGLA: un viaje sin fecha suma
  // igual en kg/kg de azúcar/rendimiento por lote — solo queda fuera de los cortes
  // por día (Tendencia, "último día" de Alertas), que no tienen dónde ubicarlo.
  fecha: string | null;
  finca_id: string | null; // 'LOTE4' | 'VIRGINIA'
  veh: number | null;
  maq: number | null;
  kg_neto: number;
  kg_trash: number;
  kg_azucar: number;
  brix: number;
  pol: number;
  pureza: number;
  rdto: number;
};

// index_10.html:1004
export const META = 10.0;

// Umbrales usados en Resumen/Alertas (index_10.html: renderResumen, renderAlertas)
export const UMBRALES = {
  rdtoWarn: 9.5,
  polOk: 15,
  polWarn: 14,
  purezaWarn: 85,
  purezaCritica: 84.5,
  trashWarn: 10,
  trashAlerta: 12,
} as const;

export function avg<T>(arr: T[], fn: (x: T) => number): number {
  return arr.length ? arr.reduce((s, x) => s + fn(x), 0) / arr.length : 0;
}

export function sum<T>(arr: T[], fn: (x: T) => number): number {
  return arr.reduce((s, x) => s + fn(x), 0);
}

// Días con datos, ordenados. Los viajes sin fecha quedan afuera a propósito: no
// pertenecen a ningún día. Usar junto con contarSinFecha() para avisarlo en pantalla
// en vez de que desaparezcan en silencio.
export function fechasUnicas(infraruts: InfrarutRow[]): string[] {
  return [
    ...new Set(infraruts.filter((r) => r.fecha != null).map((r) => r.fecha as string)),
  ].sort();
}

export function contarSinFecha(infraruts: InfrarutRow[]): number {
  return infraruts.filter((r) => r.fecha == null).length;
}

export function porFincaFecha(
  infraruts: InfrarutRow[],
  fecha: string,
  fincaId: string,
): InfrarutRow[] {
  return infraruts.filter((r) => r.fecha === fecha && r.finca_id === fincaId);
}

export type Stats = {
  n: number;
  kg_neto: number;
  kg_trash: number;
  kg_azucar: number;
  brix: number;
  pol: number;
  pureza: number;
  rdto: number;
  trash_pct: number;
};

// index_10.html:1014-1023
export function statsFor(viajes: InfrarutRow[]): Stats | null {
  if (!viajes.length) return null;
  const kn = sum(viajes, (r) => r.kg_neto);
  const kt = sum(viajes, (r) => r.kg_trash);
  const ka = sum(viajes, (r) => r.kg_azucar);
  return {
    n: viajes.length,
    kg_neto: kn,
    kg_trash: kt,
    kg_azucar: ka,
    brix: avg(viajes, (r) => r.brix),
    pol: avg(viajes, (r) => r.pol),
    pureza: avg(viajes, (r) => r.pureza),
    rdto: avg(viajes, (r) => r.rdto),
    trash_pct: (kt / (kn + kt)) * 100,
  };
}

export function rdtoPillClass(rdto: number): "ok" | "warn" | "bad" {
  if (rdto >= META) return "ok";
  if (rdto >= UMBRALES.rdtoWarn) return "warn";
  return "bad";
}
