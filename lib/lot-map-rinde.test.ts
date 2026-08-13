// Rinde por lote en el mapa (tn/ha) y despachos todavía sin pesaje del ingenio.
// La regla: un viaje anotado en la libreta que el ingenio no pesó NO suma toneladas
// (no existe el número todavía), pero tampoco desaparece — se cuenta aparte para que
// la tarjeta pueda avisar que el rinde que muestra está incompleto.
import { describe, expect, it } from "vitest";
import { computeMapaLotes, surcosEstimados, type MapaTrip } from "./lot-map";
import { contornoAproximado, cuadradoAproximado, hectareasDe } from "./lote-geo";

function trip(remito: number, kg_neto: number, rdto: number | null = 10.5): MapaTrip {
  return { remito, ingenio_id: "concepcion", kg_neto, rdto };
}

const VACIO = {
  recetaLotes: [],
  recetaItems: [],
  trabajos: [],
  trabajoInsumos: [],
  productos: [],
  tcBlue: 1,
  rindeEsperadoDefault: 70,
  alertasPorLote: {},
  ingenioNombre: (id: string) => id,
};

describe("rinde por lote (tn/ha)", () => {
  it("tn/ha = kg neto conciliado ÷ 1000 ÷ hectáreas", () => {
    const [paco] = computeMapaLotes({
      ...VACIO,
      lotesIngenio: [{ lote_key: "PACO", nombre: "Paco", ha: 45, surcos_por_ha: 61 }],
      cpsCampo: [
        { cp: 1, lote: "PACO" },
        { cp: 2, lote: "PACO" },
      ],
      trips: [trip(1, 1_500_000), trip(2, 1_389_000)],
      bajas: [],
      lotesFisicos: [{ id: "VA-09", ha: 30, nombre: "Paco" }],
    });
    // 2.889 tn ÷ 45 ha = 64,2 tn/ha
    expect(paco.tn_ha).toBeCloseTo(64.2, 1);
    expect(paco.viajes).toBe(2);
    expect(paco.viajes_sin_pesaje).toBe(0);
  });

  it("kg/surco = kg neto conciliado ÷ (ha × surcos_por_ha)", () => {
    // Caso conocido: Paco con 2.088.627 kg sobre 45 ha × 61 surcos = 2.745 surcos.
    const [paco] = computeMapaLotes({
      ...VACIO,
      lotesIngenio: [{ lote_key: "PACO", nombre: "Paco", ha: 45, surcos_por_ha: 61 }],
      cpsCampo: [{ cp: 1, lote: "PACO" }],
      trips: [trip(1, 2_088_627)],
      bajas: [],
      lotesFisicos: [{ id: "VA-09", ha: 30, nombre: "Paco" }],
    });
    expect(paco.kg_surco).toBeCloseTo(760.88, 2);
    expect(Math.round(paco.kg_surco)).toBe(761);
  });

  it("kg/surco es exactamente tn/surco × 1000", () => {
    const [paco] = computeMapaLotes({
      ...VACIO,
      lotesIngenio: [{ lote_key: "PACO", nombre: "Paco", ha: 45, surcos_por_ha: 61 }],
      cpsCampo: [{ cp: 1, lote: "PACO" }],
      trips: [trip(1, 2_088_627)],
      bajas: [],
      lotesFisicos: [],
    });
    expect(paco.kg_surco).toBeCloseTo(paco.tn_surco * 1000, 6);
  });

  it("marca el surcos/ha como estimado cuando el lote no lo tiene cargado", () => {
    const [x] = computeMapaLotes({
      ...VACIO,
      lotesIngenio: [{ lote_key: "X", nombre: "X", ha: 10, surcos_por_ha: null }],
      cpsCampo: [{ cp: 1, lote: "X" }],
      trips: [trip(1, 610_000)],
      bajas: [],
      lotesFisicos: [],
    });
    expect(x.surcos_estimados).toBe(true);
    expect(x.surcos_por_ha).toBe(61); // SURCOS_POR_HA_DEFAULT
    expect(x.kg_surco).toBeCloseTo(1000, 6); // 610.000 ÷ (10 × 61)
  });

  it("un 61 cargado también cuenta como estimado: es el placeholder sembrado parejo", () => {
    expect(surcosEstimados(61)).toBe(true);
    expect(surcosEstimados(null)).toBe(true);
    expect(surcosEstimados(0)).toBe(true);
  });

  it("un surcos/ha distinto del default sí es un dato medido", () => {
    expect(surcosEstimados(58)).toBe(false);
    const [x] = computeMapaLotes({
      ...VACIO,
      lotesIngenio: [{ lote_key: "X", nombre: "X", ha: 10, surcos_por_ha: 58 }],
      cpsCampo: [{ cp: 1, lote: "X" }],
      trips: [trip(1, 580_000)],
      bajas: [],
      lotesFisicos: [],
    });
    expect(x.surcos_estimados).toBe(false);
    expect(x.kg_surco).toBeCloseTo(1000, 6); // 580.000 ÷ (10 × 58)
  });

  it("sin viajes conciliados el kg/surco queda en 0 (la tarjeta muestra '—')", () => {
    const [x] = computeMapaLotes({
      ...VACIO,
      lotesIngenio: [{ lote_key: "X", nombre: "X", ha: 30, surcos_por_ha: 61 }],
      cpsCampo: [{ cp: 1, lote: "X" }], // en libreta pero sin pesaje
      trips: [],
      bajas: [],
      lotesFisicos: [],
    });
    expect(x.viajes).toBe(0);
    expect(x.kg_surco).toBe(0);
  });

  it("un lote sin hectáreas cargadas no divide por cero", () => {
    const [x] = computeMapaLotes({
      ...VACIO,
      lotesIngenio: [{ lote_key: "X", nombre: "X", ha: 0, surcos_por_ha: 61 }],
      cpsCampo: [{ cp: 1, lote: "X" }],
      trips: [trip(1, 30_000)],
      bajas: [],
      lotesFisicos: [],
    });
    expect(x.tn_ha).toBe(0);
    expect(x.kg_surco).toBe(0);
  });
});

describe("despachos sin pesaje del ingenio", () => {
  const params = {
    ...VACIO,
    lotesIngenio: [{ lote_key: "PACO", nombre: "Paco", ha: 10, surcos_por_ha: 61 }],
    cpsCampo: [
      { cp: 1, lote: "PACO" },
      { cp: 2, lote: "PACO" }, // sin INFRARUT
      { cp: 3, lote: "PACO" }, // sin INFRARUT
    ],
    trips: [trip(1, 300_000)],
    bajas: [],
    lotesFisicos: [{ id: "VA-09", ha: 30, nombre: "Paco" }],
  };

  it("los cuenta aparte y no los suma a las toneladas", () => {
    const [paco] = computeMapaLotes(params);
    expect(paco.viajes).toBe(1);
    expect(paco.viajes_sin_pesaje).toBe(2);
    expect(paco.cosechado_tn).toBe(300); // solo el viaje pesado
    expect(paco.tn_ha).toBeCloseTo(30, 6);
  });

  it("un lote con TODOS los viajes sin pesar aparece igual, con rinde 0", () => {
    const [gely] = computeMapaLotes({
      ...params,
      lotesIngenio: [{ lote_key: "GELY", nombre: "Gely", ha: 16, surcos_por_ha: 61 }],
      cpsCampo: [
        { cp: 10, lote: "GELY" },
        { cp: 11, lote: "GELY" },
      ],
      trips: [],
    });
    expect(gely.viajes).toBe(0);
    expect(gely.viajes_sin_pesaje).toBe(2);
    expect(gely.tn_ha).toBe(0);
    expect(gely.color).toBe("sin-cosecha");
  });

  it("un despacho dado de baja (ARCA) no cuenta ni como pesado ni como pendiente", () => {
    const [paco] = computeMapaLotes({ ...params, bajas: [{ cp: 2 }] });
    expect(paco.viajes).toBe(1);
    expect(paco.viajes_sin_pesaje).toBe(1); // quedaba el cp 3
  });
});

describe("lotes que solo existen en la libreta", () => {
  // GELY está en la tabla `lotes` y ya despachó, pero nadie le creó la fila en
  // `lotes_ingenio`. Antes no aparecía en el mapa; ahora entra solo.
  const cards = computeMapaLotes({
    ...VACIO,
    lotesIngenio: [{ lote_key: "PACO", nombre: "Paco", ha: 45, surcos_por_ha: 61 }],
    cpsCampo: [
      { cp: 1, lote: "PACO" },
      { cp: 2, lote: "GELY" },
      { cp: 3, lote: "GELY" },
    ],
    trips: [trip(1, 300_000), trip(2, 32_000)],
    bajas: [],
    lotesFisicos: [
      { id: "VA-09", ha: 30, nombre: "Paco" },
      { id: "GELY", ha: 16, nombre: "Gely" },
    ],
  });
  const gely = cards.find((c) => c.lote_key === "GELY");

  it("aparece sin necesidad de declararlo en lotes_ingenio", () => {
    expect(gely).toBeDefined();
    expect(gely!.solo_libreta).toBe(true);
  });

  it("toma nombre y hectáreas reales de la tabla `lotes`", () => {
    expect(gely!.nombre).toBe("Gely");
    expect(gely!.ha).toBe(16);
    expect(gely!.tn_ha).toBeCloseTo(2, 6); // 32 tn ÷ 16 ha
  });

  it("cuenta bien sus viajes pesados y pendientes", () => {
    expect(gely!.viajes).toBe(1);
    expect(gely!.viajes_sin_pesaje).toBe(1);
  });

  it("los lotes declarados siguen marcados como no-provisorios", () => {
    expect(cards.find((c) => c.lote_key === "PACO")!.solo_libreta).toBe(false);
  });

  it("expone la nota de contorno aproximado", () => {
    expect(gely!.contorno_nota).toContain("400 × 400 m");
  });
});

describe("contorno aproximado", () => {
  it("el cuadrado de 16 ha mide 400 m de lado y encierra 16 ha", () => {
    const centro = { lat: -26.743168, lon: -64.823662 };
    const puntos = cuadradoAproximado(centro, 16);
    expect(puntos).toHaveLength(5);
    expect(puntos[0]).toEqual(puntos[4]); // anillo cerrado
    expect(hectareasDe(puntos)).toBeCloseTo(16, 2);
  });

  it("queda centrado en la coordenada dada", () => {
    const centro = { lat: -26.743168, lon: -64.823662 };
    const p = cuadradoAproximado(centro, 16);
    expect((p[0].lat + p[2].lat) / 2).toBeCloseTo(centro.lat, 10);
    expect((p[0].lon + p[1].lon) / 2).toBeCloseTo(centro.lon, 10);
  });

  it("GELY tiene contorno cargado; un lote cualquiera no", () => {
    const c = contornoAproximado("GELY");
    expect(c?.aproximado).toBe(true);
    expect(c?.ha).toBe(16);
    expect(c?.centro).toEqual({ lat: -26.743168, lon: -64.823662 });
    expect(contornoAproximado("VA-09")).toBeNull();
  });

  it("escala con la superficie: 64 ha → 800 m de lado", () => {
    const p = cuadradoAproximado({ lat: -26.74, lon: -64.82 }, 64);
    expect(hectareasDe(p)).toBeCloseTo(64, 2);
  });
});
