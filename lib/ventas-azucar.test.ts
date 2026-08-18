// Disponible = azúcar propia − kg vendidos. Ver lib/ventas-azucar.ts.
import { describe, expect, it } from "vitest";
import { PESO_BOLSA } from "./costos";
import {
  computeVentasAzucar,
  disponibleAzucar,
  importeVenta,
  resumenVentas,
  type VentaAzucarRow,
} from "./ventas-azucar";

function venta(v: Partial<VentaAzucarRow> & { id: string }): VentaAzucarRow {
  return {
    fecha: "2026-08-10",
    ingenio_id: "concepcion",
    bolsas: 0,
    kg: 0,
    precio_unit_con_iva: null,
    importe_neto: null,
    iva: null,
    importe_total: null,
    comprobante: null,
    comprador: null,
    obs: null,
    ...v,
  };
}

describe("disponibleAzucar", () => {
  it("resta los kg vendidos de la azúcar propia y los pasa a tn y bolsas", () => {
    const d = disponibleAzucar(100_000, [venta({ id: "1", bolsas: 400, kg: 20_000 })]);
    expect(d.kg_vendidos).toBe(20_000);
    expect(d.kg).toBe(80_000);
    expect(d.tn).toBeCloseTo(80, 6);
    expect(d.bolsas).toBeCloseTo(80_000 / PESO_BOLSA, 6); // 1.600
    expect(d.sobrevendido).toBe(false);
  });

  it("sin ventas, el disponible es toda la azúcar propia", () => {
    const d = disponibleAzucar(100_000, []);
    expect(d.kg).toBe(100_000);
    expect(d.kg_vendidos).toBe(0);
    expect(d.sobrevendido).toBe(false);
  });

  it("no clampea a cero: si se vendió de más lo marca en vez de esconderlo", () => {
    const d = disponibleAzucar(10_000, [venta({ id: "1", bolsas: 300, kg: 15_000 })]);
    expect(d.kg).toBe(-5_000);
    expect(d.sobrevendido).toBe(true);
  });
});

describe("importeVenta", () => {
  it("usa el total cuando está", () => {
    expect(importeVenta(venta({ id: "1", importe_total: 1_000, importe_neto: 900 }))).toBe(
      1_000,
    );
  });

  it("si no hay total, suma neto + IVA", () => {
    expect(importeVenta(venta({ id: "1", importe_neto: 1_000, iva: 210 }))).toBe(1_210);
  });

  it("como último recurso, precio unitario × bolsas", () => {
    expect(importeVenta(venta({ id: "1", bolsas: 100, precio_unit_con_iva: 30_000 }))).toBe(
      3_000_000,
    );
  });

  it("una venta sin ningún dato de plata vale 0 (pero sus kilos siguen contando)", () => {
    expect(importeVenta(venta({ id: "1", bolsas: 100, kg: 5_000 }))).toBe(0);
  });
});

describe("resumenVentas", () => {
  it("suma operaciones, bolsas, kg e importe", () => {
    const r = resumenVentas([
      venta({ id: "1", bolsas: 400, kg: 20_000, importe_total: 12_000_000 }),
      venta({ id: "2", bolsas: 100, kg: 5_000, importe_neto: 3_000_000, iva: 630_000 }),
    ]);
    expect(r.operaciones).toBe(2);
    expect(r.bolsas).toBe(500);
    expect(r.kg).toBe(25_000);
    expect(r.importe).toBe(15_630_000);
    expect(r.importe_incompleto).toBe(false);
  });

  it("marca el importe como incompleto si alguna venta no trae plata", () => {
    const r = resumenVentas([
      venta({ id: "1", bolsas: 400, kg: 20_000, importe_total: 12_000_000 }),
      venta({ id: "2", bolsas: 100, kg: 5_000 }),
    ]);
    expect(r.importe).toBe(12_000_000);
    expect(r.importe_incompleto).toBe(true);
  });
});

describe("computeVentasAzucar", () => {
  const ventas = [
    venta({ id: "1", ingenio_id: "concepcion", bolsas: 400, kg: 20_000, importe_total: 12_000_000 }),
    venta({ id: "2", ingenio_id: "trinidad", bolsas: 200, kg: 10_000, importe_total: 6_000_000 }),
  ];

  it("filtra por ingenio: cada card descuenta solo sus propias ventas", () => {
    const con = computeVentasAzucar("concepcion", 100_000, ventas);
    expect(con.ventas.operaciones).toBe(1);
    expect(con.ventas.bolsas).toBe(400);
    expect(con.disponible.kg).toBe(80_000);

    const trd = computeVentasAzucar("trinidad", 50_000, ventas);
    expect(trd.ventas.bolsas).toBe(200);
    expect(trd.disponible.kg).toBe(40_000);
  });

  it("con ingenio null toma todas las ventas (consolidado)", () => {
    const total = computeVentasAzucar(null, 150_000, ventas);
    expect(total.ventas.operaciones).toBe(2);
    expect(total.ventas.importe).toBe(18_000_000);
    expect(total.disponible.kg).toBe(120_000);
  });

  it("un ingenio sin ventas muestra disponible = propia", () => {
    const trd = computeVentasAzucar("trinidad", 50_000, [ventas[0]]);
    expect(trd.ventas.operaciones).toBe(0);
    expect(trd.disponible.kg).toBe(50_000);
  });
});
