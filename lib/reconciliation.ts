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

import { avg, sum, type InfrarutRow } from "./business-rules";

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

export type LoteIngenioRow = {
  id: string;
  nombre: string;
  ingenio_id: string;
  lote_key: string; // matchea CpCampoRow.lote
  ha: number;
  surcos_por_ha: number;
};

export type RendimientoLote = {
  lote_key: string;
  nombre: string;
  ha: number;
  surcos_por_ha: number;
  n: number;
  kg_neto_total: number;
  tn_ha: number;
  kg_surco: number;
  rdto_promedio: number;
};

// Rendimiento por lote: para cada lote con metadata (ha, surcos/ha), toma los viajes
// reconciliados (cps_campo cruzado con su INFRARUT por remito) cuyo `lote` matchea
// `lote_key`, y agrega kg neto / tn/ha / kg/surco / rdto% promedio medidos por el
// ingenio. Devuelve una fila por cada lote en `lotesIngenio`, incluidos los que
// todavía no tienen ningún viaje reconciliado (n: 0) — quien consuma esto decide si
// los oculta o los muestra en gris (ver /rendimiento vs. la card de Reconciliación).
export function rendimientoPorLote(
  cpsCampo: CpCampoRow[],
  infraruts: InfrarutRow[],
  bajas: BajaArcaRow[],
  lotesIngenio: LoteIngenioRow[],
): RendimientoLote[] {
  const { reconciliados, infrarutPorRemito } = reconciliar(cpsCampo, infraruts, bajas);

  const porLoteKey = new Map<string, InfrarutRow[]>();
  for (const x of reconciliados) {
    if (!x.lote) continue;
    const inf = infrarutPorRemito.get(x.cp);
    if (!inf) continue;
    if (!porLoteKey.has(x.lote)) porLoteKey.set(x.lote, []);
    porLoteKey.get(x.lote)!.push(inf);
  }

  const result: RendimientoLote[] = lotesIngenio.map((meta) => {
    const rows = porLoteKey.get(meta.lote_key) ?? [];
    const kgNetoTotal = sum(rows, (r) => r.kg_neto);
    const surcosTotal = meta.ha * meta.surcos_por_ha;
    return {
      lote_key: meta.lote_key,
      nombre: meta.nombre,
      ha: meta.ha,
      surcos_por_ha: meta.surcos_por_ha,
      n: rows.length,
      kg_neto_total: kgNetoTotal,
      tn_ha: meta.ha > 0 ? kgNetoTotal / 1000 / meta.ha : 0,
      kg_surco: surcosTotal > 0 ? kgNetoTotal / surcosTotal : 0,
      rdto_promedio: avg(rows, (r) => r.rdto),
    };
  });
  return result.sort((a, b) => b.kg_neto_total - a.kg_neto_total);
}

export type RendimientoTotal = {
  n: number;
  kg_neto_total: number;
  ha: number;
  surcos_totales: number;
  tn_ha: number;
  kg_surco: number;
  rdto_promedio: number;
};

// Totaliza un conjunto de RendimientoLote (un ingenio, o ambos combinados) — solo
// sobre los lotes con al menos un viaje reconciliado, para no diluir el tn/ha con
// hectáreas de lotes que todavía no cosecharon nada. rdto_promedio se reconstruye
// ponderado por cantidad de viajes (no es el promedio simple de los promedios por
// lote, que sesgaría el resultado hacia lotes con pocos viajes).
export function totalizarRendimiento(lotes: RendimientoLote[]): RendimientoTotal {
  const conDatos = lotes.filter((l) => l.n > 0);
  const n = sum(conDatos, (l) => l.n);
  const kgNetoTotal = sum(conDatos, (l) => l.kg_neto_total);
  const ha = sum(conDatos, (l) => l.ha);
  const surcosTotales = sum(conDatos, (l) => l.ha * l.surcos_por_ha);
  return {
    n,
    kg_neto_total: kgNetoTotal,
    ha,
    surcos_totales: surcosTotales,
    tn_ha: ha > 0 ? kgNetoTotal / 1000 / ha : 0,
    kg_surco: surcosTotales > 0 ? kgNetoTotal / surcosTotales : 0,
    rdto_promedio: n > 0 ? sum(conDatos, (l) => l.rdto_promedio * l.n) / n : 0,
  };
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
