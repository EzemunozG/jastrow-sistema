// Form de Documentos: schema de metadatos y validación del archivo
// (lib/forms/documentos.ts). Es lo que corre la Server Action antes de tocar el
// bucket o la tabla.
import { describe, expect, it } from "vitest";
import {
  DOCUMENTO_TIPOS,
  MAX_ARCHIVO_BYTES,
  MAX_ARCHIVO_MB,
  SIN_VALOR,
  documentoSchema,
  esTipoConocido,
  limpiarSelect,
  tipoLabel,
  validarArchivo,
} from "./documentos";

const MINIMO = { titulo: "Informe Frau", tipo: "informe_agronomico" };

describe("documentoSchema", () => {
  it("acepta el mínimo: título y tipo", () => {
    const r = documentoSchema.safeParse(MINIMO);
    expect(r.success).toBe(true);
  });

  it("el título es obligatorio", () => {
    const r = documentoSchema.safeParse({ ...MINIMO, titulo: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("El título es obligatorio");
  });

  it("un título de solo espacios tampoco pasa", () => {
    expect(documentoSchema.safeParse({ ...MINIMO, titulo: "   " }).success).toBe(false);
  });

  it("recorta los espacios del título", () => {
    const r = documentoSchema.safeParse({ ...MINIMO, titulo: "  Contrato  " });
    expect(r.success && r.data.titulo).toBe("Contrato");
  });

  it("rechaza un tipo que no está en la lista (y que el check de la tabla rebotaría)", () => {
    expect(documentoSchema.safeParse({ ...MINIMO, tipo: "inventado" }).success).toBe(
      false,
    );
  });

  it("acepta los siete tipos declarados", () => {
    for (const t of DOCUMENTO_TIPOS) {
      expect(documentoSchema.safeParse({ ...MINIMO, tipo: t.id }).success).toBe(true);
    }
  });

  it("fecha, autor, lote e ingenio son opcionales", () => {
    const r = documentoSchema.safeParse(MINIMO);
    expect(r.success && r.data.fecha).toBeUndefined();
    expect(r.success && r.data.lote_key).toBeUndefined();
  });

  it("acepta los metadatos completos", () => {
    const r = documentoSchema.safeParse({
      ...MINIMO,
      fecha: "2026-07-28",
      autor: "Ing. agrónomo",
      resumen: "Recomendación de fertilización",
      lote_key: "FRAU",
      ingenio_id: "trinidad",
      obs: "Copia en papel en la oficina",
      existingArchivoPath: "informe_agronomico/1_x.pdf",
    });
    expect(r.success && r.data.lote_key).toBe("FRAU");
  });
});

describe("centinela de los Select en 'Ninguno'", () => {
  it("limpiarSelect convierte el centinela en undefined", () => {
    expect(limpiarSelect(SIN_VALOR)).toBeUndefined();
  });

  it("deja pasar cualquier otro valor", () => {
    expect(limpiarSelect("FRAU")).toBe("FRAU");
    expect(limpiarSelect(undefined)).toBeUndefined();
  });

  // Sin esto el documento se guardaría con lote_key "__none__" y la fila mostraría el
  // chip de un lote que no existe.
  it("el centinela nunca llega al schema como si fuera un lote", () => {
    const r = documentoSchema.safeParse({
      ...MINIMO,
      lote_key: limpiarSelect(SIN_VALOR),
      ingenio_id: limpiarSelect(SIN_VALOR),
    });
    expect(r.success && r.data.lote_key).toBeUndefined();
    expect(r.success && r.data.ingenio_id).toBeUndefined();
  });
});

describe("validarArchivo", () => {
  it("acepta los formatos esperados", () => {
    for (const nombre of [
      "informe.pdf",
      "planilla.xlsx",
      "viejo.xls",
      "carta.docx",
      "foto.JPG",
      "scan.png",
      "datos.csv",
    ]) {
      expect(validarArchivo(nombre, 1_000)).toBeNull();
    }
  });

  it("rechaza un formato no admitido y dice cuál era", () => {
    const msg = validarArchivo("video.mp4", 1_000);
    expect(msg).toContain(".mp4");
    expect(msg).toContain("no admitido");
  });

  it("rechaza un archivo sin extensión", () => {
    expect(validarArchivo("archivo-sin-extension", 1_000)).toContain("extensión");
  });

  it("rechaza un archivo más pesado que el máximo", () => {
    const msg = validarArchivo("informe.pdf", MAX_ARCHIVO_BYTES + 1);
    expect(msg).toContain(`${MAX_ARCHIVO_MB} MB`);
  });

  it("acepta un archivo justo en el límite", () => {
    expect(validarArchivo("informe.pdf", MAX_ARCHIVO_BYTES)).toBeNull();
  });

  it("valida el formato antes que el tamaño: un mp4 gigante se rechaza por formato", () => {
    expect(validarArchivo("video.mp4", MAX_ARCHIVO_BYTES * 10)).toContain("no admitido");
  });
});

describe("tipos", () => {
  it("esTipoConocido distingue los declarados", () => {
    expect(esTipoConocido("orden_maquila")).toBe(true);
    expect(esTipoConocido("orden_de_maquila")).toBe(false);
  });

  it("tipoLabel traduce el id y no rompe con uno desconocido", () => {
    expect(tipoLabel("liquidacion")).toBe("Liquidación de maquila");
    expect(tipoLabel("desconocido")).toBe("desconocido");
  });
});
