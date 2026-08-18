// Ventas de la azúcar propia y cuánta queda disponible por ingenio.
//
// disponible = azúcar propia (lib/azucar.ts) − kg vendidos. La azúcar propia sale de
// una fórmula PROVISORIA (ver NOTA_PROVISORIA en lib/azucar.ts), así que el disponible
// hereda esa provisoriedad y encima le falta una pata: el ingenio, al liquidar,
// descuenta retenciones EN ESPECIE (bolsas que se queda, no pesos) que este cálculo no
// modela. Toda pantalla que muestre el disponible tiene que decirlo → NOTA_DISPONIBLE.

import { PESO_BOLSA } from "./costos";

export const NOTA_DISPONIBLE =
  "Disponible según fórmula provisional; las liquidaciones del ingenio descuentan retenciones en especie.";

export type VentaAzucarRow = {
  id: string;
  fecha: string;
  ingenio_id: string;
  bolsas: number;
  kg: number;
  precio_unit_con_iva: number | null;
  importe_neto: number | null;
  iva: number | null;
  importe_total: number | null;
  comprobante: string | null;
  comprador: string | null;
  obs: string | null;
};

// Importe con IVA de una venta. La carga viene de comprobantes distintos y no siempre
// trae las cuatro columnas: se usa el total si está, si no neto+IVA, y como último
// recurso precio unitario × bolsas. Devuelve 0 si no hay ningún dato de plata (una
// venta sin importe sigue descontando kilos del disponible, solo no suma $).
export function importeVenta(v: VentaAzucarRow): number {
  if (v.importe_total != null) return v.importe_total;
  if (v.importe_neto != null || v.iva != null)
    return (v.importe_neto ?? 0) + (v.iva ?? 0);
  if (v.precio_unit_con_iva != null) return v.precio_unit_con_iva * v.bolsas;
  return 0;
}

export type ResumenVentas = {
  operaciones: number;
  bolsas: number;
  kg: number;
  importe: number; // ARS con IVA
  // Alguna venta del grupo no tiene ningún dato de importe → el $ que se muestra está
  // incompleto y la pantalla lo aclara en vez de mostrarlo como si fuera el total.
  importe_incompleto: boolean;
};

export function resumenVentas(ventas: VentaAzucarRow[]): ResumenVentas {
  return {
    operaciones: ventas.length,
    bolsas: ventas.reduce((s, v) => s + (v.bolsas || 0), 0),
    kg: ventas.reduce((s, v) => s + (v.kg || 0), 0),
    importe: ventas.reduce((s, v) => s + importeVenta(v), 0),
    importe_incompleto: ventas.some((v) => importeVenta(v) === 0),
  };
}

export type Disponible = {
  kg_propia: number;
  kg_vendidos: number;
  kg: number;
  tn: number;
  bolsas: number; // de PESO_BOLSA kg, igual que bolsas_propias
  // Se vendió más de lo que la fórmula dice que hay. No se clampea a 0 a propósito:
  // sería tapar una inconsistencia real (fórmula provisoria mal calibrada, o kg mal
  // cargados) justo en el número que se usa para decidir cuánto queda por vender.
  sobrevendido: boolean;
};

export function disponibleAzucar(
  kgPropia: number,
  ventas: VentaAzucarRow[],
): Disponible {
  const vendidos = ventas.reduce((s, v) => s + (v.kg || 0), 0);
  const kg = kgPropia - vendidos;
  return {
    kg_propia: kgPropia,
    kg_vendidos: vendidos,
    kg,
    tn: kg / 1000,
    bolsas: kg / PESO_BOLSA,
    sobrevendido: kg < 0,
  };
}

export type VentasIngenio = {
  ventas: ResumenVentas;
  disponible: Disponible;
};

// Para una card de ingenio: filtra las ventas de ese ingenio y arma resumen +
// disponible. Con `ingenioId = null` toma TODAS las ventas (consolidado).
export function computeVentasAzucar(
  ingenioId: string | null,
  kgPropia: number,
  ventas: VentaAzucarRow[],
): VentasIngenio {
  const propias =
    ingenioId == null ? ventas : ventas.filter((v) => v.ingenio_id === ingenioId);
  return {
    ventas: resumenVentas(propias),
    disponible: disponibleAzucar(kgPropia, propias),
  };
}
