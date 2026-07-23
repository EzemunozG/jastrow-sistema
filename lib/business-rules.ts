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

export type InfrarutRow = {
  cp: number;
  ingenio_id: string; // 'concepcion' | 'trinidad' — el cp es correlativo POR ingenio
  remito: number | null;
  fecha: string; // YYYY-MM-DD
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

export function fechasUnicas(infraruts: InfrarutRow[]): string[] {
  return [...new Set(infraruts.map((r) => r.fecha))].sort();
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
