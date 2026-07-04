// Reconciliación de CPs del campo contra el INFRARUT del ingenio.
// Portado de index_10.html:1763-1821 (renderReconcilia) y :1882-1930 (gap detection).
//
// Detalle importante a preservar: la reconciliación matchea `cps_campo.cp` contra
// `infraruts.remito` (NO contra `infraruts.cp` — son numeraciones distintas: `cp` es
// el correlativo interno del ingenio, `remito` es el número de carta de porte que
// también anota el campo). Ver index_10.html:1765.

import type { InfrarutRow } from "./business-rules";

export type CpCampoRow = {
  cp: number;
  fecha: string | null;
  camion: string | null;
  obs: string | null;
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
  desde: number;
  hasta: number;
  faltantes: number;
  fechaAnt: string;
  fechaSig: string;
  probable: boolean; // heurística: faltantes >= 5 y cambia de fecha (index_10.html:1912)
};

// Algoritmo GLOBAL por número de CP consecutivo (no por finca/fecha) — se preserva
// tal cual porque puede estar ajustado a cómo el ingenio asigna CPs entre todos los
// productores, no solo Jastrow. No "corregir" a un algoritmo por finca sin confirmar.
export function detectarBrechas(infraruts: InfrarutRow[]): Gap[] {
  const sorted = [...infraruts].sort((a, b) => a.cp - b.cp);
  const gaps: Gap[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = sorted[i + 1].cp - sorted[i].cp;
    if (diff > 1) {
      const fechaAnt = sorted[i].fecha;
      const fechaSig = sorted[i + 1].fecha;
      gaps.push({
        desde: sorted[i].cp,
        hasta: sorted[i + 1].cp,
        faltantes: diff - 1,
        fechaAnt,
        fechaSig,
        probable: diff - 1 >= 5 && fechaSig !== fechaAnt,
      });
    }
  }
  return gaps.sort((a, b) => b.faltantes - a.faltantes);
}
