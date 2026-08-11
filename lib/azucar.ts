// Azúcar por ingenio: cuánta se produjo con la caña de Jastrow y cuánta le queda a
// Jastrow después de lo que se lleva el ingenio y lo que se paga de cosecha/flete.
//
// ⚠ LAS DOS REGLAS SON PROVISORIAS — pendientes de confirmar contra el contrato de
// cada ingenio (indicadas por el usuario el 2026-08-11, sin contrato a la vista). Toda
// pantalla que muestre estos números tiene que decirlo: ver NOTA_PROVISORIA.
//
// No se guardan en la base a propósito: mientras sean provisorias conviene que estén
// en un solo lugar del código, versionadas y con test, y no repartidas en filas de
// configuración que nadie sabe quién tocó. Cuando el contrato las confirme, esto pasa
// a app_settings (o a una tabla por ingenio con vigencia desde/hasta).

import { PESO_BOLSA } from "./costos";
import type { InfrarutRow } from "./business-rules";

export const NOTA_PROVISORIA =
  "Porcentajes provisionales — pendiente confirmación de contrato con el ingenio.";

// Concepción: de la azúcar producida, el ingenio se queda 40% y la cosecha/flete se
// lleva 33%; a Jastrow le queda el 27% restante.
export const CONCEPCION_PCT_INGENIO = 0.4;
export const CONCEPCION_PCT_COSECHA_FLETE = 0.33;
export const CONCEPCION_PCT_PROPIO =
  1 - CONCEPCION_PCT_INGENIO - CONCEPCION_PCT_COSECHA_FLETE; // 0.27

// Trinidad: no se calcula sobre la azúcar producida sino sobre la CAÑA entregada —
// 35 kg de azúcar por cada 1.000 kg de caña neta, castigados por un 93%.
//
// ⚠ Acá está la ambigüedad más grande de las dos reglas: "bruto × 93% × 35 kg / 1.000
// kg" no dice qué es "bruto". Se toma la caña neta entregada porque es la única
// lectura que da un resultado del mismo orden que Concepción (~36% de la azúcar
// producida, contra 27%); leyéndolo como kg de azúcar daría ~3%, once veces menos, que
// no se parece a ningún esquema de reparto. Si el contrato dice otra cosa, cambiar
// SOLO la base en propiaTrinidad() — el resto del cálculo no se toca.
export const TRINIDAD_FACTOR = 0.93;
export const TRINIDAD_KG_AZUCAR_POR_TN_CANA = 35;

export function propiaConcepcion(kgAzucarProducida: number): number {
  return kgAzucarProducida * CONCEPCION_PCT_PROPIO;
}

export function propiaTrinidad(kgCanaNeta: number): number {
  return (kgCanaNeta * TRINIDAD_FACTOR * TRINIDAD_KG_AZUCAR_POR_TN_CANA) / 1000;
}

export type ResumenAzucar = {
  ingenio_id: string;
  nombre: string;
  viajes: number;
  kg_cana_neta: number;
  kg_azucar_producida: number;
  kg_azucar_propia: number;
  bolsas_propias: number; // de 50 kg (PESO_BOLSA), alimenta el arriendo
  // % de la azúcar producida que le queda a Jastrow. Derivado, no parámetro: en
  // Concepción da el 27% fijo y en Trinidad depende del rdto de la caña de ese día.
  pct_sobre_producida: number;
  regla: string; // explicación corta para mostrar en la card
};

export function resumenAzucarIngenio(
  ingenioId: string,
  nombre: string,
  infraruts: InfrarutRow[],
): ResumenAzucar {
  // TODOS los viajes del ingenio, tengan o no libreta: la libreta decide a qué lote se
  // le atribuyen los kilos, no si el ingenio los recibió. Un viaje sin transcribir ya
  // fue pesado y molido igual.
  const delIngenio = infraruts.filter((r) => r.ingenio_id === ingenioId);
  const kgCana = delIngenio.reduce((s, r) => s + (r.kg_neto || 0), 0);
  const kgAzucar = delIngenio.reduce((s, r) => s + (r.kg_azucar || 0), 0);

  const propia =
    ingenioId === "trinidad" ? propiaTrinidad(kgCana) : propiaConcepcion(kgAzucar);
  const regla =
    ingenioId === "trinidad"
      ? `${TRINIDAD_KG_AZUCAR_POR_TN_CANA} kg por tn de caña × ${formatPct(TRINIDAD_FACTOR)}`
      : `${formatPct(CONCEPCION_PCT_PROPIO)} de la azúcar producida (100% − ${formatPct(
          CONCEPCION_PCT_INGENIO,
        )} ingenio − ${formatPct(CONCEPCION_PCT_COSECHA_FLETE)} cosecha/flete)`;

  return {
    ingenio_id: ingenioId,
    nombre,
    viajes: delIngenio.length,
    kg_cana_neta: kgCana,
    kg_azucar_producida: kgAzucar,
    kg_azucar_propia: propia,
    bolsas_propias: propia / PESO_BOLSA,
    pct_sobre_producida: kgAzucar > 0 ? (propia / kgAzucar) * 100 : 0,
    regla,
  };
}

function formatPct(fraccion: number): string {
  return `${Math.round(fraccion * 100)}%`;
}

export type TotalAzucar = {
  viajes: number;
  kg_cana_neta: number;
  kg_azucar_producida: number;
  kg_azucar_propia: number;
  bolsas_propias: number;
  pct_sobre_producida: number;
};

export function totalizarAzucar(resumenes: ResumenAzucar[]): TotalAzucar {
  const suma = (fn: (r: ResumenAzucar) => number) =>
    resumenes.reduce((s, r) => s + fn(r), 0);
  const producida = suma((r) => r.kg_azucar_producida);
  const propia = suma((r) => r.kg_azucar_propia);
  return {
    viajes: suma((r) => r.viajes),
    kg_cana_neta: suma((r) => r.kg_cana_neta),
    kg_azucar_producida: producida,
    kg_azucar_propia: propia,
    bolsas_propias: suma((r) => r.bolsas_propias),
    pct_sobre_producida: producida > 0 ? (propia / producida) * 100 : 0,
  };
}
