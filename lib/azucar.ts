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

// Trinidad: no se calcula sobre la azúcar producida sino sobre la CAÑA, y la base es
// la caña BRUTA (con tierra y hojas, como entró a la balanza), no la neta.
//
// El contrato no usa el trash realmente pesado: le descuenta al bruto un trash FIJO
// del 7% y sobre ese resultado paga 35 kg de azúcar por cada 1.000 kg. Es una cláusula
// a favor del productor cuando la caña viene sucia — en lo que va de la zafra el trash
// real de Trinidad es 14,08% del bruto, o sea el doble del 7% que reconoce el contrato.
//
// Reconstrucción del bruto: `infraruts` no guarda el peso bruto (el INFRARUT informa
// neto y trash por separado), así que bruto = kg_neto + kg_trash. Ver
// resumenAzucarIngenio().
export const TRINIDAD_TRASH_CONTRACTUAL = 0.07;
export const TRINIDAD_FACTOR = 1 - TRINIDAD_TRASH_CONTRACTUAL; // 0.93
export const TRINIDAD_KG_AZUCAR_POR_TN_CANA = 35;

export function propiaConcepcion(kgAzucarProducida: number): number {
  return kgAzucarProducida * CONCEPCION_PCT_PROPIO;
}

// OJO: el argumento es la caña BRUTA (kg_neto + kg_trash), no la neta. Pasarle la neta
// subestima la azúcar propia en ~14% — es el error que tuvo esta función hasta el
// 2026-08-11.
export function propiaTrinidad(kgCanaBruta: number): number {
  return (kgCanaBruta * TRINIDAD_FACTOR * TRINIDAD_KG_AZUCAR_POR_TN_CANA) / 1000;
}

export type ResumenAzucar = {
  ingenio_id: string;
  nombre: string;
  viajes: number;
  kg_cana_neta: number;
  kg_cana_bruta: number; // neto + trash: la base sobre la que liquida Trinidad
  kg_trash: number;
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
  const kgTrash = delIngenio.reduce((s, r) => s + (r.kg_trash || 0), 0);
  const kgBruta = kgCana + kgTrash;
  const kgAzucar = delIngenio.reduce((s, r) => s + (r.kg_azucar || 0), 0);

  const propia =
    ingenioId === "trinidad" ? propiaTrinidad(kgBruta) : propiaConcepcion(kgAzucar);
  const regla =
    ingenioId === "trinidad"
      ? `sobre la caña BRUTA, con un trash fijo contractual de ${formatPct(
          TRINIDAD_TRASH_CONTRACTUAL,
        )} (no el real pesado), ${TRINIDAD_KG_AZUCAR_POR_TN_CANA} kg de azúcar por cada 1.000 kg`
      : `${formatPct(CONCEPCION_PCT_PROPIO)} de la azúcar producida (100% − ${formatPct(
          CONCEPCION_PCT_INGENIO,
        )} ingenio − ${formatPct(CONCEPCION_PCT_COSECHA_FLETE)} cosecha/flete)`;

  return {
    ingenio_id: ingenioId,
    nombre,
    viajes: delIngenio.length,
    kg_cana_neta: kgCana,
    kg_cana_bruta: kgBruta,
    kg_trash: kgTrash,
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
  kg_cana_bruta: number;
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
    kg_cana_bruta: suma((r) => r.kg_cana_bruta),
    kg_azucar_producida: producida,
    kg_azucar_propia: propia,
    bolsas_propias: suma((r) => r.bolsas_propias),
    pct_sobre_producida: producida > 0 ? (propia / producida) * 100 : 0,
  };
}
