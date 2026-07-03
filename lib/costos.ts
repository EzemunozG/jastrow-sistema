// Cálculo de costos y arriendo. Portado de index_10.html:2572-2701 (renderCostos).
// PESO_BOLSA y las tasas de cambio ya no son constantes hardcodeadas: viven en la
// tabla app_settings (editables desde la UI) — ver supabase/migrations schema.
import type { InfrarutRow } from "./business-rules";

export const PESO_BOLSA = 50; // kg por bolsa (index_10.html:2579)

export type LoteCosto = {
  id: string;
  ha: number;
  tipo: "Propio" | "Arrendado";
  finca_id: string | null;
  arriendo: number | null; // bolsas/ha/año
};

export type TrabajoCosto = {
  lote_id: string | null;
  tipo: string;
  costo_total: number;
};

// index_10.html:2584-2586
export function calcularArriendo(lotes: LoteCosto[], precioBolsa: number) {
  const lotesArrendados = lotes.filter(
    (l) => l.tipo === "Arrendado" && (l.arriendo ?? 0) > 0,
  );
  const totalBolsas = sum(lotesArrendados, (l) => (l.arriendo ?? 0) * l.ha);
  const totalArrPesos = precioBolsa > 0 ? totalBolsas * precioBolsa : 0;
  return { lotesArrendados, totalBolsas, totalArrPesos };
}

// index_10.html:2640: costo total / kg azúcar = (costos trabajos + arriendo en $) / kg azúcar del INFRARUT
export function costoPorKgAzucar(
  totalCostosTrabajos: number,
  totalArrPesos: number,
  totalKgAzucar: number,
): number | null {
  const totalCostos = totalCostosTrabajos + totalArrPesos;
  if (totalCostos <= 0 || totalKgAzucar <= 0) return null;
  return totalCostos / totalKgAzucar;
}

export function costoPorCategoria(trabajos: TrabajoCosto[]) {
  const byCat = new Map<string, number>();
  for (const t of trabajos) {
    byCat.set(t.tipo, (byCat.get(t.tipo) ?? 0) + (t.costo_total ?? 0));
  }
  return byCat;
}

// index_10.html:2663-2668: costo y producción de un lote puntual
export function costoPorLote(
  lote: { id: string; finca_id: string | null },
  trabajos: TrabajoCosto[],
  infraruts: InfrarutRow[],
) {
  const trab = trabajos.filter((t) => t.lote_id === lote.id);
  const costo = sum(trab, (t) => t.costo_total ?? 0);
  const infrarutLote = lote.finca_id
    ? infraruts.filter((r) => r.finca_id === lote.finca_id)
    : [];
  const kgAzucar = sum(infrarutLote, (r) => r.kg_azucar);
  const tnCana = sum(infrarutLote, (r) => r.kg_neto) / 1000;
  return {
    costo,
    kgAzucar,
    tnCana,
    costoPorHa: null as number | null, // completar con lote.ha en el caller
    costoPorKgAzucar: costo > 0 && kgAzucar > 0 ? costo / kgAzucar : null,
  };
}

function sum<T>(arr: T[], fn: (x: T) => number): number {
  return arr.reduce((s, x) => s + fn(x), 0);
}
