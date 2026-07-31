import { describe, expect, it } from "vitest";
import { computeMapaLotes, dupsLoteFisico, LOTE_FISICO_POR_KEY } from "./lot-map";

describe("LOTE_FISICO_POR_KEY", () => {
  it("no asigna un mismo lote físico a más de un lote_key (evita double-count)", () => {
    // Si esto falla, un lote físico está en dos lote_key y sus recetas/trabajos se
    // contarían dos veces en el Mapa de lotes. Revisar el objeto en lib/lot-map.ts.
    expect(dupsLoteFisico(LOTE_FISICO_POR_KEY)).toEqual([]);
  });

  it("el detector encuentra un físico repetido cuando lo hay", () => {
    const dups = dupsLoteFisico({
      "TALA POSO 2": ["L4-TP2"],
      "TALA POSO 3": ["L4-TP3", "L4-TP2"], // L4-TP2 repetido a propósito
    });
    expect(dups).toEqual([{ fisico: "L4-TP2", keys: ["TALA POSO 2", "TALA POSO 3"] }]);
  });
});

describe("prorrateo de recetas compartidas", () => {
  // Una receta de US$1000 aplicada sobre L4-TP2 (40 ha) + L4-TP3 (60 ha), que en el
  // mapeo real son TALA POSO 2 y TALA POSO 3. El costo se reparte por ha, no se duplica.
  const cards = computeMapaLotes({
    lotesIngenio: [
      { lote_key: "TALA POSO 2", nombre: "TP2", ha: 30, surcos_por_ha: 61 },
      { lote_key: "TALA POSO 3", nombre: "TP3", ha: 30, surcos_por_ha: 61 },
    ],
    cpsCampo: [],
    trips: [],
    bajas: [],
    recetaLotes: [
      { receta_id: "R", lote_id: "L4-TP2" },
      { receta_id: "R", lote_id: "L4-TP3" },
    ],
    recetaItems: [
      { receta_id: "R", producto_id: "P", dosis: 1, unidad: "l", cantidad: 10, total: 1000 },
    ],
    trabajos: [],
    trabajoInsumos: [],
    productos: [{ id: "P", nombre: "Producto" }],
    lotesFisicos: [
      { id: "L4-TP2", ha: 40 },
      { id: "L4-TP3", ha: 60 },
    ],
    tcBlue: 1,
    rindeEsperadoDefault: 70,
    alertasPorLote: {},
    ingenioNombre: (id) => id,
  });
  const tp2 = cards.find((c) => c.lote_key === "TALA POSO 2")!;
  const tp3 = cards.find((c) => c.lote_key === "TALA POSO 3")!;

  it("reparte por hectárea del lote físico", () => {
    expect(tp2.gastado_usd).toBeCloseTo(400); // 1000 × 40/100
    expect(tp3.gastado_usd).toBeCloseTo(600); // 1000 × 60/100
  });

  it("marca la aplicación como compartida", () => {
    expect(tp2.aplicaciones[0].compartida).toBe(true);
    expect(tp3.aplicaciones[0].compartida).toBe(true);
  });

  it("cuenta la receta una sola vez en el total del sistema", () => {
    expect(tp2.gastado_usd + tp3.gastado_usd).toBeCloseTo(1000);
  });
});
