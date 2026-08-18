// Semáforo de análisis de suelo y chequeo de surcos del plan de fertilización.
// Ver lib/suelo.ts para los umbrales y por qué viven en código.
import { describe, expect, it } from "vitest";
import {
  chequearTotalPlan,
  computeSuelos,
  evaluarAnalisis,
  anclaLote,
  mgPctCic,
  type AnalisisSueloRow,
  type PlanFertilizacionRow,
} from "./suelo";

function analisis(a: Partial<AnalisisSueloRow> & { id: string }): AnalisisSueloRow {
  return {
    fecha: "2026-08-01",
    lote_key: null,
    sector: null,
    laboratorio: null,
    informe_nro: null,
    profundidad: null,
    ph: null,
    mo_pct: null,
    n_total_pct: null,
    p_ppm: null,
    cic: null,
    ca_me: null,
    mg_me: null,
    k_me: null,
    na_me: null,
    salinidad_ces: null,
    textura: null,
    obs: null,
    ...a,
  };
}

// ── Fixture REAL: análisis del lote Paco (valores pasados por el usuario, 2026-08-18).
// El Mg viene ya como % de la CIC (12,4%) — acá se lo reconstruye con un par mg_me/cic
// que dé ese porcentaje, que es lo que va a haber en la base.
const PACO = analisis({
  id: "paco",
  lote_key: "PACO",
  ph: 6.29,
  mo_pct: 2.16,
  n_total_pct: 0.145,
  p_ppm: 17.0,
  cic: 20.0,
  mg_me: 2.48, // 2,48 / 20,0 = 12,4% de la CIC
});

// Los otros dos casos NO son análisis reales (el usuario solo pasó los números de
// Paco): son fixtures sintéticos para cubrir los tramos del semáforo que Paco no toca
// — fósforo por debajo del rango de ligera insuficiencia, y todo en verde.
const P_MUY_BAJO = analisis({
  id: "sintetico-p-bajo",
  lote_key: "SINTETICO A",
  ph: 7.6,
  mo_pct: 3.1,
  n_total_pct: 0.18,
  p_ppm: 9.4,
  cic: 20.0,
  mg_me: 4.0, // 20% de la CIC
});

const TODO_OK = analisis({
  id: "sintetico-ok",
  lote_key: "SINTETICO B",
  ph: 6.5,
  mo_pct: 3.4,
  n_total_pct: 0.21,
  p_ppm: 31.0,
  cic: 25.0,
  mg_me: 5.0, // 20% de la CIC
});

describe("semáforo del análisis de Paco (datos reales)", () => {
  const e = evaluarAnalisis(PACO).evaluacion;

  it("pH 6,29 está en el óptimo 6,0–7,0", () => {
    expect(e.ph).toEqual({ nivel: "ok", etiqueta: "óptimo" });
  });

  it("MO 2,16% es baja (< 2,5%)", () => {
    expect(e.mo.nivel).toBe("warn");
    expect(e.mo.etiqueta).toBe("bajo");
  });

  it("N total 0,145% es insuficiente (< 0,150%)", () => {
    expect(e.n.nivel).toBe("warn");
    expect(e.n.etiqueta).toBe("insuficiente");
  });

  it("P 17,0 ppm cae en ligera insuficiencia (13–25 ppm)", () => {
    expect(e.p.nivel).toBe("warn");
    expect(e.p.etiqueta).toBe("ligera insuf.");
  });

  it("Mg 12,4% de la CIC es bajo (< 15,4%)", () => {
    expect(evaluarAnalisis(PACO).mg_pct_cic).toBeCloseTo(12.4, 6);
    expect(e.mg.nivel).toBe("warn");
    expect(e.mg.etiqueta).toBe("bajo");
  });
});

describe("otros tramos del semáforo", () => {
  it("P por debajo de 13 ppm es insuficiencia franca, no ligera", () => {
    expect(evaluarAnalisis(P_MUY_BAJO).evaluacion.p).toEqual({
      nivel: "bad",
      etiqueta: "insuficiente",
    });
  });

  it("pH por encima de 7,0 se marca alcalino; por debajo de 6,0, ácido", () => {
    expect(evaluarAnalisis(P_MUY_BAJO).evaluacion.ph.etiqueta).toBe("alcalino");
    expect(evaluarAnalisis(analisis({ id: "x", ph: 5.4 })).evaluacion.ph.etiqueta).toBe(
      "ácido",
    );
  });

  it("un análisis con todo dentro de rango sale entero en ok", () => {
    const e = evaluarAnalisis(TODO_OK).evaluacion;
    expect([e.ph.nivel, e.mo.nivel, e.n.nivel, e.p.nivel, e.mg.nivel]).toEqual([
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
    ]);
  });

  it("los bordes exactos de cada umbral cuentan como suficientes", () => {
    const borde = evaluarAnalisis(
      analisis({ id: "borde", ph: 6.0, mo_pct: 2.5, n_total_pct: 0.15, p_ppm: 25, cic: 100, mg_me: 15.4 }),
    ).evaluacion;
    expect(borde.ph.nivel).toBe("ok");
    expect(borde.mo.nivel).toBe("ok");
    expect(borde.n.nivel).toBe("ok");
    expect(borde.p.nivel).toBe("warn"); // 25 ppm todavía es ligera insuficiencia
    expect(borde.mg.nivel).toBe("ok");
  });

  it("lo que el informe no trae queda en s/d, nunca en verde", () => {
    const e = evaluarAnalisis(analisis({ id: "vacio" })).evaluacion;
    expect([e.ph.nivel, e.mo.nivel, e.n.nivel, e.p.nivel, e.mg.nivel]).toEqual([
      "sd",
      "sd",
      "sd",
      "sd",
      "sd",
    ]);
  });

  it("sin CIC no hay porcentaje de Mg que calcular", () => {
    expect(mgPctCic(2.48, null)).toBeNull();
    expect(mgPctCic(2.48, 0)).toBeNull();
    expect(mgPctCic(null, 20)).toBeNull();
  });
});

describe("chequeo del total del plan contra los surcos del sistema", () => {
  // 45 ha × 61 surcos/ha = 2.745 surcos (Paco, con los surcos/ha de referencia).
  it("no avisa nada cuando el total guardado coincide con la cuenta", () => {
    const c = chequearTotalPlan({
      dosisKgSurco: 1,
      totalKgGuardado: 2_745,
      ha: 45,
      surcosPorHa: 61,
    });
    expect(c.surcos).toBe(2_745);
    expect(c.total_calculado).toBe(2_745);
    expect(c.desvio_pct).toBeCloseTo(0, 6);
    expect(c.advertencia).toBe(false);
  });

  it("tolera hasta un 5% de diferencia", () => {
    // Calculado 2.745 vs guardado 2.700 → 1,67% de desvío.
    const c = chequearTotalPlan({
      dosisKgSurco: 1,
      totalKgGuardado: 2_700,
      ha: 45,
      surcosPorHa: 61,
    });
    expect(c.desvio_pct).toBeCloseTo(1.667, 2);
    expect(c.advertencia).toBe(false);
  });

  it("avisa 'revisar surcos del lote' cuando se pasa del 5%", () => {
    // Plan armado con los surcos reales (3.200) contra los 2.745 del sistema: 14,2%.
    const c = chequearTotalPlan({
      dosisKgSurco: 1,
      totalKgGuardado: 3_200,
      ha: 45,
      surcosPorHa: 61,
    });
    expect(c.total_calculado).toBe(2_745);
    expect(c.desvio_pct).toBeCloseTo(14.22, 1);
    expect(c.advertencia).toBe(true);
  });

  it("sin ha o sin surcos/ha no hay cuenta ni advertencia", () => {
    const c = chequearTotalPlan({
      dosisKgSurco: 1,
      totalKgGuardado: 3_200,
      ha: null,
      surcosPorHa: 61,
    });
    expect(c.surcos).toBeNull();
    expect(c.total_calculado).toBeNull();
    expect(c.advertencia).toBe(false);
  });

  it("un total guardado en 0 o vacío no dispara la advertencia", () => {
    for (const totalKgGuardado of [0, null]) {
      const c = chequearTotalPlan({
        dosisKgSurco: 1,
        totalKgGuardado,
        ha: 45,
        surcosPorHa: 61,
      });
      expect(c.total_calculado).toBe(2_745);
      expect(c.desvio_pct).toBeNull();
      expect(c.advertencia).toBe(false);
    }
  });
});

describe("computeSuelos", () => {
  const plan: PlanFertilizacionRow = {
    id: "p1",
    campania: "2026",
    lote_key: "PACO",
    producto: "Urea",
    dosis_kg_surco: 1.2,
    total_kg: 3_294,
    ventana: "octubre",
    estado: "planificado",
    obs: null,
  };

  it("agrupa análisis y plan por lote y trae ha/surcos de lotes_ingenio", () => {
    const [lote] = computeSuelos({
      analisis: [PACO],
      planes: [plan],
      lotesIngenio: [
        { lote_key: "PACO", nombre: "Paco", ha: 45, surcos_por_ha: 61 },
      ],
    });
    expect(lote.nombre).toBe("Paco");
    expect(lote.analisis).toHaveLength(1);
    expect(lote.plan[0].chequeo.surcos).toBe(2_745);
    expect(lote.plan[0].chequeo.total_calculado).toBeCloseTo(3_294, 6);
    expect(lote.plan[0].chequeo.advertencia).toBe(false);
  });

  it("un lote_key que no está en lotes_ingenio entra igual, sin ha ni cuenta", () => {
    const [lote] = computeSuelos({
      analisis: [],
      planes: [{ ...plan, lote_key: "LOTE NUEVO" }],
      lotesIngenio: [],
    });
    expect(lote.lote_key).toBe("LOTE NUEVO");
    expect(lote.nombre).toBe("LOTE NUEVO");
    expect(lote.ha).toBeNull();
    expect(lote.plan[0].chequeo.total_calculado).toBeNull();
  });

  it("no lista lotes sin análisis ni plan", () => {
    const lotes = computeSuelos({
      analisis: [],
      planes: [],
      lotesIngenio: [{ lote_key: "PACO", nombre: "Paco", ha: 45, surcos_por_ha: 61 }],
    });
    expect(lotes).toEqual([]);
  });

  it("ordena los análisis de un lote del más nuevo al más viejo", () => {
    const [lote] = computeSuelos({
      analisis: [
        analisis({ id: "viejo", lote_key: "PACO", fecha: "2025-05-01" }),
        analisis({ id: "nuevo", lote_key: "PACO", fecha: "2026-08-01" }),
      ],
      planes: [],
      lotesIngenio: [],
    });
    expect(lote.analisis.map((a) => a.id)).toEqual(["nuevo", "viejo"]);
  });
});

describe("anclaLote", () => {
  it("arma un ancla estable a partir del lote_key", () => {
    expect(anclaLote("LAS 101")).toBe("lote-las-101");
    expect(anclaLote("TALA POSO 2")).toBe("lote-tala-poso-2");
    expect(anclaLote("PACO")).toBe("lote-paco");
  });
});
