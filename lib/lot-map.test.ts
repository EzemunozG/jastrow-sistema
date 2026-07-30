import { describe, expect, it } from "vitest";
import { dupsLoteFisico, LOTE_FISICO_POR_KEY } from "./lot-map";

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
