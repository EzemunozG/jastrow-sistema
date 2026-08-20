// Listado de Documentos: filtros, orden y utilidades de archivo (lib/documentos.ts).
import { describe, expect, it } from "vitest";
import {
  contarPorTipo,
  countDocFiltrosActivos,
  extensionDe,
  filtrarDocumentos,
  listarDocumentos,
  nombreArchivo,
  ordenarDocumentos,
  parseDocFiltros,
  sanitizarNombreArchivo,
  storagePath,
  type DocFiltros,
  type DocumentoRow,
} from "./documentos";

const INGENIOS = ["concepcion", "trinidad"];

function doc(d: Partial<DocumentoRow> & { id: string; titulo: string }): DocumentoRow {
  return {
    fecha: "2026-07-01",
    tipo: "otro",
    autor: null,
    resumen: null,
    archivo_path: null,
    lote_key: null,
    ingenio_id: null,
    obs: null,
    ...d,
  };
}

const TODOS: DocFiltros = { tipo: "all", ingenio: "all" };

const INFORME = doc({
  id: "1",
  titulo: "Informe agronómico Frau",
  tipo: "informe_agronomico",
  fecha: "2026-07-28",
  ingenio_id: "trinidad",
  lote_key: "FRAU",
});
const LIQUIDACION = doc({
  id: "2",
  titulo: "Liquidación agosto",
  tipo: "liquidacion",
  fecha: "2026-08-15",
  ingenio_id: "concepcion",
});
const CONTRATO = doc({
  id: "3",
  titulo: "Contrato de arriendo Gely",
  tipo: "contrato",
  fecha: "2026-03-02",
  ingenio_id: null, // un contrato no es de ningún ingenio
});

const TODOS_LOS_DOCS = [INFORME, LIQUIDACION, CONTRATO];

describe("parseDocFiltros", () => {
  it("sin searchParams devuelve todo sin filtrar", () => {
    expect(parseDocFiltros({}, INGENIOS)).toEqual(TODOS);
  });

  it("toma tipo e ingenio válidos", () => {
    expect(parseDocFiltros({ tipo: "contrato", ingenio: "trinidad" }, INGENIOS)).toEqual({
      tipo: "contrato",
      ingenio: "trinidad",
    });
  });

  it("descarta un tipo o un ingenio que no existan en vez de filtrar a cero", () => {
    expect(
      parseDocFiltros({ tipo: "inventado", ingenio: "ledesma" }, INGENIOS),
    ).toEqual(TODOS);
  });

  it("ignora los valores repetidos en la URL (?tipo=a&tipo=b llega como array)", () => {
    expect(parseDocFiltros({ tipo: ["contrato", "factura"] }, INGENIOS).tipo).toBe("all");
  });

  it("cuenta cuántos filtros están activos", () => {
    expect(countDocFiltrosActivos(TODOS)).toBe(0);
    expect(countDocFiltrosActivos({ tipo: "contrato", ingenio: "all" })).toBe(1);
    expect(countDocFiltrosActivos({ tipo: "contrato", ingenio: "trinidad" })).toBe(2);
  });
});

describe("filtrarDocumentos", () => {
  it("sin filtros devuelve todo", () => {
    expect(filtrarDocumentos(TODOS_LOS_DOCS, TODOS)).toHaveLength(3);
  });

  it("filtra por tipo", () => {
    const r = filtrarDocumentos(TODOS_LOS_DOCS, { tipo: "liquidacion", ingenio: "all" });
    expect(r.map((d) => d.id)).toEqual(["2"]);
  });

  it("filtra por ingenio", () => {
    const r = filtrarDocumentos(TODOS_LOS_DOCS, { tipo: "all", ingenio: "trinidad" });
    expect(r.map((d) => d.id)).toEqual(["1"]);
  });

  it("combina los dos filtros", () => {
    expect(
      filtrarDocumentos(TODOS_LOS_DOCS, { tipo: "contrato", ingenio: "trinidad" }),
    ).toEqual([]);
  });

  it("un documento sin ingenio queda fuera al pedir un ingenio concreto", () => {
    const r = filtrarDocumentos(TODOS_LOS_DOCS, { tipo: "all", ingenio: "concepcion" });
    expect(r.map((d) => d.id)).toEqual(["2"]);
    expect(r.some((d) => d.id === "3")).toBe(false);
  });

  it("no muta el array original", () => {
    const copia = [...TODOS_LOS_DOCS];
    filtrarDocumentos(TODOS_LOS_DOCS, { tipo: "contrato", ingenio: "all" });
    expect(TODOS_LOS_DOCS).toEqual(copia);
  });
});

describe("ordenarDocumentos", () => {
  it("ordena por fecha descendente", () => {
    expect(ordenarDocumentos(TODOS_LOS_DOCS).map((d) => d.id)).toEqual(["2", "1", "3"]);
  });

  it("un documento sin fecha va al final, no arriba", () => {
    const sinFecha = doc({ id: "4", titulo: "Sin fecha", fecha: null });
    const r = ordenarDocumentos([sinFecha, ...TODOS_LOS_DOCS]);
    expect(r.map((d) => d.id)).toEqual(["2", "1", "3", "4"]);
  });

  it("empate de fecha: desempata por título para que el orden sea estable", () => {
    const a = doc({ id: "a", titulo: "Zeta", fecha: "2026-05-05" });
    const b = doc({ id: "b", titulo: "Alfa", fecha: "2026-05-05" });
    expect(ordenarDocumentos([a, b]).map((d) => d.id)).toEqual(["b", "a"]);
    expect(ordenarDocumentos([b, a]).map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("dos sin fecha también quedan ordenados entre sí por título", () => {
    const a = doc({ id: "a", titulo: "Zeta", fecha: null });
    const b = doc({ id: "b", titulo: "Alfa", fecha: null });
    expect(ordenarDocumentos([a, b]).map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("no muta el array original", () => {
    const orden = TODOS_LOS_DOCS.map((d) => d.id);
    ordenarDocumentos(TODOS_LOS_DOCS);
    expect(TODOS_LOS_DOCS.map((d) => d.id)).toEqual(orden);
  });
});

describe("listarDocumentos (filtro + orden, lo que ve la página)", () => {
  it("filtra y después ordena", () => {
    const otro = doc({
      id: "5",
      titulo: "Liquidación julio",
      tipo: "liquidacion",
      fecha: "2026-07-15",
      ingenio_id: "concepcion",
    });
    const r = listarDocumentos([...TODOS_LOS_DOCS, otro], {
      tipo: "liquidacion",
      ingenio: "concepcion",
    });
    expect(r.map((d) => d.id)).toEqual(["2", "5"]); // agosto antes que julio
  });

  it("filtros que no matchean nada dan lista vacía, no un error", () => {
    expect(listarDocumentos(TODOS_LOS_DOCS, { tipo: "factura", ingenio: "all" })).toEqual(
      [],
    );
  });
});

describe("contarPorTipo", () => {
  it("cuenta por tipo para mostrar el número al lado del filtro", () => {
    expect(contarPorTipo(TODOS_LOS_DOCS)).toEqual({
      informe_agronomico: 1,
      liquidacion: 1,
      contrato: 1,
    });
  });

  it("una lista vacía no rompe", () => {
    expect(contarPorTipo([])).toEqual({});
  });
});

describe("nombres y paths de archivo", () => {
  it("nombreArchivo saca la carpeta y el timestamp del path del bucket", () => {
    expect(nombreArchivo("informe_agronomico/1755000000000_Informe-Frau.pdf")).toBe(
      "Informe-Frau.pdf",
    );
  });

  it("sin archivo devuelve null", () => {
    expect(nombreArchivo(null)).toBeNull();
    expect(nombreArchivo(undefined)).toBeNull();
    expect(nombreArchivo("")).toBeNull();
  });

  it("extensionDe reconoce la extensión en minúscula", () => {
    expect(extensionDe("Informe.PDF")).toBe("pdf");
    expect(extensionDe("planilla.xlsx")).toBe("xlsx");
    expect(extensionDe("sin-extension")).toBe("");
  });

  it("sanitiza acentos y espacios pero conserva la extensión", () => {
    expect(sanitizarNombreArchivo("Análisis de suelo — Paco.pdf")).toBe(
      "Analisis-de-suelo-Paco.pdf",
    );
  });

  it("un nombre que queda vacío al limpiarlo no produce un path roto", () => {
    expect(sanitizarNombreArchivo("¿¡!.pdf")).toBe("archivo.pdf");
  });

  it("storagePath agrupa por tipo y antepone el timestamp", () => {
    expect(storagePath("contrato", "Contrato Gely.pdf", 1755000000000)).toBe(
      "contrato/1755000000000_Contrato-Gely.pdf",
    );
  });

  it("el path generado vuelve a leerse con nombreArchivo", () => {
    const path = storagePath("liquidacion", "Liquidación agosto.pdf", 1755000000000);
    expect(nombreArchivo(path)).toBe("Liquidacion-agosto.pdf");
  });
});
