// Fórmulas de azúcar propia por ingenio. PROVISORIAS (ver lib/azucar.ts): estos tests
// fijan lo que hoy dice el código, para que si el contrato cambia los números el
// cambio sea deliberado y no un efecto colateral de otra cosa.
import { describe, expect, it } from "vitest";
import {
  CONCEPCION_PCT_PROPIO,
  propiaConcepcion,
  propiaTrinidad,
  resumenAzucarIngenio,
  totalizarAzucar,
} from "./azucar";
import type { InfrarutRow } from "./business-rules";

function viaje(
  ingenio_id: string,
  kg_neto: number,
  kg_azucar: number,
): InfrarutRow {
  return {
    cp: 1,
    ingenio_id,
    remito: null,
    fecha: null,
    finca_id: null,
    veh: null,
    maq: null,
    kg_neto,
    kg_trash: 0,
    kg_azucar,
    brix: 0,
    pol: 0,
    pureza: 0,
    rdto: 0,
  };
}

describe("porcentajes de Concepción", () => {
  it("le queda el 27%: 100% − 40% ingenio − 33% cosecha/flete", () => {
    expect(CONCEPCION_PCT_PROPIO).toBeCloseTo(0.27, 10);
    expect(propiaConcepcion(100_000)).toBeCloseTo(27_000, 6);
  });

  it("se calcula sobre la azúcar producida, no sobre la caña", () => {
    expect(propiaConcepcion(0)).toBe(0);
    expect(propiaConcepcion(960_642)).toBeCloseTo(259_373.34, 2);
  });
});

describe("fórmula de Trinidad", () => {
  it("35 kg por tonelada de caña, castigado por 93%", () => {
    // 1.000.000 kg de caña = 1.000 tn → 1.000 × 35 × 0,93 = 32.550 kg
    expect(propiaTrinidad(1_000_000)).toBeCloseTo(32_550, 6);
  });

  it("es lineal con la caña entregada", () => {
    expect(propiaTrinidad(2_000_000)).toBeCloseTo(propiaTrinidad(1_000_000) * 2, 6);
    expect(propiaTrinidad(0)).toBe(0);
  });
});

describe("resumenAzucarIngenio", () => {
  const rows = [
    viaje("concepcion", 30_000, 3_000),
    viaje("concepcion", 30_000, 3_000),
    viaje("trinidad", 30_000, 2_700),
  ];

  it("suma solo los viajes del ingenio pedido", () => {
    const c = resumenAzucarIngenio("concepcion", "Ingenio Concepción", rows);
    expect(c.viajes).toBe(2);
    expect(c.kg_cana_neta).toBe(60_000);
    expect(c.kg_azucar_producida).toBe(6_000);
    expect(c.kg_azucar_propia).toBeCloseTo(1_620, 6); // 6.000 × 0,27
  });

  it("Trinidad sale de la caña, no de la azúcar producida", () => {
    const t = resumenAzucarIngenio("trinidad", "Ingenio Trinidad", rows);
    expect(t.kg_cana_neta).toBe(30_000);
    // 30 tn × 35 × 0,93 = 976,5 kg
    expect(t.kg_azucar_propia).toBeCloseTo(976.5, 6);
  });

  it("convierte a bolsas de 50 kg", () => {
    const c = resumenAzucarIngenio("concepcion", "Ingenio Concepción", rows);
    expect(c.bolsas_propias).toBeCloseTo(1_620 / 50, 6);
  });

  it("el % sobre producida es derivado: fijo en Concepción, variable en Trinidad", () => {
    expect(
      resumenAzucarIngenio("concepcion", "C", rows).pct_sobre_producida,
    ).toBeCloseTo(27, 6);
    // Trinidad depende del rdto de la caña: con 2.700 kg de azúcar sobre 30 tn da 36,2%
    expect(resumenAzucarIngenio("trinidad", "T", rows).pct_sobre_producida).toBeCloseTo(
      36.17,
      1,
    );
  });

  it("cuenta los viajes sin libreta igual (el ingenio los recibió y molió)", () => {
    // Ninguna fila tiene remito ni fecha: son viajes sin transcribir, y suman.
    const c = resumenAzucarIngenio("concepcion", "C", [
      viaje("concepcion", 30_000, 3_000),
    ]);
    expect(c.viajes).toBe(1);
    expect(c.kg_azucar_propia).toBeCloseTo(810, 6);
  });

  it("no divide por cero sin viajes", () => {
    const vacio = resumenAzucarIngenio("concepcion", "C", []);
    expect(vacio.kg_azucar_propia).toBe(0);
    expect(vacio.pct_sobre_producida).toBe(0);
  });
});

describe("totalizarAzucar", () => {
  it("consolida los dos ingenios sumando kilos, no promediando porcentajes", () => {
    const rows = [
      viaje("concepcion", 100_000, 10_000),
      viaje("trinidad", 100_000, 9_000),
    ];
    const total = totalizarAzucar([
      resumenAzucarIngenio("concepcion", "C", rows),
      resumenAzucarIngenio("trinidad", "T", rows),
    ]);
    expect(total.kg_cana_neta).toBe(200_000);
    expect(total.kg_azucar_producida).toBe(19_000);
    // 10.000 × 0,27 = 2.700 · 100 tn × 35 × 0,93 = 3.255 → 5.955
    expect(total.kg_azucar_propia).toBeCloseTo(5_955, 6);
    expect(total.bolsas_propias).toBeCloseTo(119.1, 6);
    expect(total.pct_sobre_producida).toBeCloseTo((5_955 / 19_000) * 100, 6);
  });

  it("total vacío no rompe", () => {
    expect(totalizarAzucar([]).pct_sobre_producida).toBe(0);
  });
});
