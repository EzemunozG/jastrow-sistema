// Fórmulas de azúcar propia por ingenio. PROVISORIAS (ver lib/azucar.ts): estos tests
// fijan lo que hoy dice el código, para que si el contrato cambia los números el
// cambio sea deliberado y no un efecto colateral de otra cosa.
import { describe, expect, it } from "vitest";
import {
  CONCEPCION_PCT_PROPIO,
  TRINIDAD_TRASH_CONTRACTUAL,
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
  kg_trash = 0,
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
    kg_trash,
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
  it("35 kg por tonelada de caña BRUTA, con el trash fijo contractual del 7%", () => {
    // 1.000.000 kg brutos → ×0,93 = 930.000 → ×35/1000 = 32.550 kg
    expect(TRINIDAD_TRASH_CONTRACTUAL).toBe(0.07);
    expect(propiaTrinidad(1_000_000)).toBeCloseTo(32_550, 6);
  });

  it("es lineal con la caña bruta", () => {
    expect(propiaTrinidad(2_000_000)).toBeCloseTo(propiaTrinidad(1_000_000) * 2, 6);
    expect(propiaTrinidad(0)).toBe(0);
  });

  // Número clavado contra la base real al 2026-08-11 (los 179 viajes de Trinidad).
  // Si este test se rompe, o cambió la fórmula o cambiaron los datos: mirar cuál de
  // las dos antes de "arreglar" el número esperado.
  it("los 179 viajes reales de Trinidad dan 208.877 kg propios", () => {
    const KG_NETO_REAL = 5_513_310;
    const KG_TRASH_REAL = 903_810;
    const bruta = KG_NETO_REAL + KG_TRASH_REAL; // 6.417.120
    expect(propiaTrinidad(bruta)).toBeCloseTo(208_877, 0); // ±1 kg
    expect(propiaTrinidad(bruta) / 50).toBeCloseTo(4_177.5, 1); // bolsas
  });

  it("usar la caña NETA en vez de la bruta subestima ~14% (el bug del 2026-08-11)", () => {
    const neta = 5_513_310;
    const bruta = neta + 903_810;
    expect(propiaTrinidad(neta)).toBeCloseTo(179_458, 0);
    expect(propiaTrinidad(bruta) - propiaTrinidad(neta)).toBeCloseTo(29_419, 0);
  });
});

describe("resumenAzucarIngenio", () => {
  const rows = [
    viaje("concepcion", 30_000, 3_000, 4_000),
    viaje("concepcion", 30_000, 3_000, 4_000),
    viaje("trinidad", 30_000, 2_700, 5_000),
  ];

  it("suma solo los viajes del ingenio pedido", () => {
    const c = resumenAzucarIngenio("concepcion", "Ingenio Concepción", rows);
    expect(c.viajes).toBe(2);
    expect(c.kg_cana_neta).toBe(60_000);
    expect(c.kg_cana_bruta).toBe(68_000); // neto + trash
    expect(c.kg_azucar_producida).toBe(6_000);
    expect(c.kg_azucar_propia).toBeCloseTo(1_620, 6); // 6.000 × 0,27
  });

  it("Concepción NO usa la caña: su regla es sobre la azúcar producida", () => {
    const conTrash = resumenAzucarIngenio("concepcion", "C", [
      viaje("concepcion", 30_000, 3_000, 99_999),
    ]);
    expect(conTrash.kg_azucar_propia).toBeCloseTo(810, 6); // 3.000 × 0,27
  });

  it("Trinidad sale de la caña BRUTA (neto + trash), no de la neta", () => {
    const t = resumenAzucarIngenio("trinidad", "Ingenio Trinidad", rows);
    expect(t.kg_cana_neta).toBe(30_000);
    expect(t.kg_cana_bruta).toBe(35_000);
    // 35 tn brutas × 0,93 × 35/1000 = 1.139,25 kg
    expect(t.kg_azucar_propia).toBeCloseTo(1_139.25, 6);
  });

  it("convierte a bolsas de 50 kg", () => {
    const c = resumenAzucarIngenio("concepcion", "Ingenio Concepción", rows);
    expect(c.bolsas_propias).toBeCloseTo(1_620 / 50, 6);
  });

  it("el % sobre producida es derivado: fijo en Concepción, variable en Trinidad", () => {
    expect(
      resumenAzucarIngenio("concepcion", "C", rows).pct_sobre_producida,
    ).toBeCloseTo(27, 6);
    // Trinidad depende del rdto y de cuánto trash traiga la caña: 1.139,25 / 2.700
    expect(resumenAzucarIngenio("trinidad", "T", rows).pct_sobre_producida).toBeCloseTo(
      42.19,
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
      viaje("concepcion", 100_000, 10_000, 10_000),
      viaje("trinidad", 100_000, 9_000, 20_000),
    ];
    const total = totalizarAzucar([
      resumenAzucarIngenio("concepcion", "C", rows),
      resumenAzucarIngenio("trinidad", "T", rows),
    ]);
    expect(total.kg_cana_neta).toBe(200_000);
    expect(total.kg_cana_bruta).toBe(230_000);
    expect(total.kg_azucar_producida).toBe(19_000);
    // Concepción 10.000 × 0,27 = 2.700 · Trinidad 120 tn brutas × 0,93 × 35/1000 = 3.906
    expect(total.kg_azucar_propia).toBeCloseTo(6_606, 6);
    expect(total.bolsas_propias).toBeCloseTo(132.12, 6);
    expect(total.pct_sobre_producida).toBeCloseTo((6_606 / 19_000) * 100, 6);
  });

  it("total vacío no rompe", () => {
    expect(totalizarAzucar([]).pct_sobre_producida).toBe(0);
  });
});
