// Reconciliación de la libreta del campo contra el INFRARUT del ingenio.
// Portado de index_10.html (versión corregida en main, 2026-07-02).
//
// Semántica de los números — LA BASE DE TODO EL SISTEMA:
// - `infraruts.remito` = número de REMITO del talonario propio del campo. Es la única
//   numeración que el campo conoce al despachar, y la secuencia es densa y consecutiva.
// - `infraruts.cp` = carta de porte que asigna EL INGENIO (correlativo entre todos los
//   productores, lleno de huecos ajenos). El campo no la conoce hasta que llega el
//   INFRARUT — NUNCA cruzar por este número.
// - `cps_campo.cp` y `bajas_arca.cp` guardan NÚMEROS DE REMITO (la columna se llama
//   "cp" por herencia del legacy viejo, que confundía los términos).
// Todo cruce libreta↔INFRARUT y toda detección de brechas va por remito.

import type { InfrarutRow } from "./business-rules";

export type CpCampoRow = {
  cp: number;
  ingenio_id: string; // a qué ingenio se despachó el remito ('concepcion' | 'trinidad')
  fecha: string | null;
  camion: string | null;
  obs: string | null;
  lote: string | null; // lote de origen del despacho; null = sin asignar
};

export type BajaArcaRow = {
  cp: number;
  gestionado: boolean;
};

export function reconciliar(
  cpsCampo: CpCampoRow[],
  infraruts: InfrarutRow[],
  bajas: BajaArcaRow[],
) {
  const enInfrarut = new Set(
    infraruts.filter((r) => r.remito != null).map((r) => r.remito as number),
  );
  const infrarutPorRemito = new Map(
    infraruts
      .filter((r) => r.remito != null)
      .map((r) => [r.remito as number, r]),
  );
  const bajasSet = new Set(bajas.map((b) => b.cp));

  const reconciliados = cpsCampo.filter(
    (x) => enInfrarut.has(x.cp) && !bajasSet.has(x.cp),
  );
  const pendientes = cpsCampo.filter(
    (x) => !enInfrarut.has(x.cp) && !bajasSet.has(x.cp),
  );

  return { reconciliados, pendientes, infrarutPorRemito };
}

export const SIN_LOTE = "Sin lote";

export type LoteBreakdown = {
  lote: string; // nombre del lote, o SIN_LOTE
  reconciliados: CpCampoRow[];
  reclamo: CpCampoRow[]; // sin reconciliar: salieron del campo y el ingenio no los reportó
  sinManual: InfrarutRow[];
};

// Desglose de la reconciliación por lote de origen. El lote vive en cps_campo,
// así que los INFRARUT "sin manual" (sin registro en libreta) no tienen lote
// asignable — van todos al grupo SIN_LOTE.
export function reconciliarPorLote(
  cpsCampo: CpCampoRow[],
  infraruts: InfrarutRow[],
  bajas: BajaArcaRow[],
): LoteBreakdown[] {
  const { reconciliados, pendientes } = reconciliar(cpsCampo, infraruts, bajas);
  const cpsCampoSet = new Set(cpsCampo.map((x) => x.cp));
  const bajasSet = new Set(bajas.map((b) => b.cp));
  const sinManual = infraruts
    .filter((r) => libretaStatus(r, cpsCampoSet, bajasSet) === "sin_manual")
    .sort((a, b) => (a.remito ?? Infinity) - (b.remito ?? Infinity));

  const grupos = new Map<string, LoteBreakdown>();
  const grupo = (lote: string) => {
    let g = grupos.get(lote);
    if (!g) {
      g = { lote, reconciliados: [], reclamo: [], sinManual: [] };
      grupos.set(lote, g);
    }
    return g;
  };
  for (const x of reconciliados) grupo(x.lote ?? SIN_LOTE).reconciliados.push(x);
  for (const x of pendientes) grupo(x.lote ?? SIN_LOTE).reclamo.push(x);
  for (const r of sinManual) grupo(SIN_LOTE).sinManual.push(r);

  // Lotes con más viajes primero; "Sin lote" siempre al final.
  return [...grupos.values()].sort((a, b) => {
    if (a.lote === SIN_LOTE) return 1;
    if (b.lote === SIN_LOTE) return -1;
    const totalA = a.reconciliados.length + a.reclamo.length;
    const totalB = b.reconciliados.length + b.reclamo.length;
    return totalB - totalA || a.lote.localeCompare(b.lote);
  });
}

// Estado a mostrar en la columna "Libreta" del listado de Viajes (index_10.html:1935-1962)
export function libretaStatus(
  infraruto: Pick<InfrarutRow, "remito">,
  cpsCampoSet: Set<number>,
  bajasSet: Set<number>,
): "baja" | "en_libreta" | "sin_manual" {
  if (infraruto.remito == null) return "sin_manual";
  if (bajasSet.has(infraruto.remito)) return "baja";
  if (cpsCampoSet.has(infraruto.remito)) return "en_libreta";
  return "sin_manual";
}

export type Gap = {
  desde: number; // remito
  hasta: number; // remito
  faltantes: number;
  fechaAnt: string;
  fechaSig: string;
  probable: boolean; // heurística: faltantes >= 3 y cambia de fecha (legacy corregido, main:2003)
};

// Brechas en la secuencia de REMITOS dentro del INFRARUT. Los remitos son la
// numeración propia del campo (densa y consecutiva), así que un salto acá significa
// un viaje que salió del campo y no llegó en los INFRARUTs cargados: reporte
// faltante del ingenio, remito anulado o baja ARCA. (La versión vieja del legacy
// hacía esto sobre `cp` — la carta de porte del ingenio — lo cual medía huecos de
// otros productores; el legacy de main lo corrigió el 2026-07-02.)
export function detectarBrechas(infraruts: InfrarutRow[]): Gap[] {
  const sorted = infraruts
    .filter((r) => r.remito != null)
    .sort((a, b) => (a.remito as number) - (b.remito as number));
  const gaps: Gap[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = (sorted[i + 1].remito as number) - (sorted[i].remito as number);
    if (diff > 1) {
      const fechaAnt = sorted[i].fecha;
      const fechaSig = sorted[i + 1].fecha;
      gaps.push({
        desde: sorted[i].remito as number,
        hasta: sorted[i + 1].remito as number,
        faltantes: diff - 1,
        fechaAnt,
        fechaSig,
        probable: diff - 1 >= 3 && fechaSig !== fechaAnt,
      });
    }
  }
  return gaps.sort((a, b) => b.faltantes - a.faltantes);
}
