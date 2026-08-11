// Alerta "Posible INFRARUT faltante": un tramo de remitos que NINGÚN ingenio reportó.
// La sutileza que hace o rompe esta alerta: el talonario de remitos es uno solo para
// los dos ingenios, así que un hueco en la secuencia de Concepción normalmente son los
// viajes que ese día salieron a Trinidad — no falta nada. Solo es un archivo faltante
// si el tramo no aparece en ninguno de los dos.
import { describe, expect, it } from "vitest";
import { computeAlertasInfrarutFaltante } from "./alerts";
import type { InfrarutRow } from "./business-rules";

function viaje(
  remito: number,
  fecha: string | null,
  ingenio_id = "concepcion",
): InfrarutRow {
  return {
    cp: remito + 100000,
    ingenio_id,
    remito,
    fecha,
    finca_id: "VIRGINIA",
    veh: 1,
    maq: 1,
    kg_neto: 30000,
    kg_trash: 1000,
    kg_azucar: 3000,
    brix: 18,
    pol: 15,
    pureza: 86,
    rdto: 10.5,
  };
}

// Tramo consecutivo de remitos del mismo día e ingenio.
function tramo(
  desde: number,
  hasta: number,
  fecha: string | null,
  ingenio_id = "concepcion",
): InfrarutRow[] {
  return Array.from({ length: hasta - desde + 1 }, (_, i) =>
    viaje(desde + i, fecha, ingenio_id),
  );
}

describe("computeAlertasInfrarutFaltante", () => {
  it("brecha simple: avisa el rango, la cantidad y el día que falta bajar", () => {
    // El caso real de agosto 2026: se cargó el 05/08 y el 07/08, falta el XLS del 06.
    const alertas = computeAlertasInfrarutFaltante([
      ...tramo(7305, 7314, "2026-08-05"),
      ...tramo(7337, 7389, "2026-08-07"),
    ]);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].severity).toBe("warn");
    expect(alertas[0].ingenio_id).toBe("concepcion");
    expect(alertas[0].message).toContain("22 remitos (7315–7336)");
    expect(alertas[0].message).toContain(
      "entre el 05/08 (remito 7314) y el 07/08 (remito 7337)",
    );
    expect(alertas[0].message).toContain(
      "Probablemente falte descargar el INFRARUT del 06/08",
    );
  });

  it("brecha cubierta por el otro ingenio: no alerta", () => {
    // Concepción salta 7100 → 7305, pero todo el tramo intermedio lo reportó Trinidad:
    // son los viajes que salieron para allá, no un archivo faltante.
    const alertas = computeAlertasInfrarutFaltante([
      ...tramo(7090, 7100, "2026-07-10"),
      ...tramo(7101, 7304, "2026-07-14", "trinidad"),
      ...tramo(7305, 7314, "2026-08-05"),
    ]);
    expect(alertas).toEqual([]);
  });

  it("brecha cubierta solo en parte: alerta únicamente por el resto", () => {
    // Trinidad cubre 7101–7213; 7214–7225 no los tiene nadie.
    const alertas = computeAlertasInfrarutFaltante([
      ...tramo(7090, 7100, "2026-07-10"),
      ...tramo(7101, 7213, "2026-07-13", "trinidad"),
      ...tramo(7226, 7304, "2026-07-15", "trinidad"),
    ]);
    expect(alertas.map((a) => a.message)).toHaveLength(1);
    expect(alertas[0].message).toContain("12 remitos (7214–7225)");
  });

  it("brecha chica (1–2 remitos) se ignora: es un anulado normal", () => {
    expect(
      computeAlertasInfrarutFaltante([
        ...tramo(7000, 7010, "2026-07-01"),
        ...tramo(7012, 7020, "2026-07-01"), // falta 7011
        ...tramo(7023, 7030, "2026-07-02"), // faltan 7021–7022
      ]),
    ).toEqual([]);
  });

  it("el umbral es 3: dos faltantes no, tres sí", () => {
    const dos = computeAlertasInfrarutFaltante([
      ...tramo(7000, 7010, "2026-07-01"),
      ...tramo(7013, 7020, "2026-07-03"), // faltan 7011–7012
    ]);
    expect(dos).toEqual([]);
    const tres = computeAlertasInfrarutFaltante([
      ...tramo(7000, 7010, "2026-07-01"),
      ...tramo(7014, 7020, "2026-07-03"), // faltan 7011–7013
    ]);
    expect(tres).toHaveLength(1);
    expect(tres[0].message).toContain("3 remitos (7011–7013)");
  });

  it("la serie 0014- (remitos ≥ 10000) no inventa una brecha gigante", () => {
    // Sin el corte por serie, 7389 → 10129 daría una brecha de 2.739 remitos.
    const alertas = computeAlertasInfrarutFaltante([
      ...tramo(7380, 7389, "2026-08-08"),
      viaje(10129, "2026-07-07"),
      viaje(10190, "2026-07-07"),
      viaje(10191, "2026-07-07"),
    ]);
    expect(alertas).toEqual([]);
  });

  it("una brecha entre ingenios distintos se emite para los dos", () => {
    // Los remitos faltantes pudieron salir a cualquiera de los dos: no se puede
    // atribuir el hueco a uno solo, y callarlo en el otro lo escondería.
    const alertas = computeAlertasInfrarutFaltante([
      ...tramo(7200, 7213, "2026-07-13"),
      ...tramo(7226, 7240, null, "trinidad"),
    ]);
    expect(alertas).toHaveLength(2);
    expect(alertas.map((a) => a.ingenio_id).sort()).toEqual([
      "concepcion",
      "trinidad",
    ]);
    expect(alertas[0].message).toContain(
      "entre el remito 7213 (Ingenio Concepción, 13/07) y el remito 7226 (Ingenio Trinidad, —)",
    );
  });

  it("sin el día justo en el medio no adivina cuál INFRARUT falta", () => {
    const alertas = computeAlertasInfrarutFaltante([
      ...tramo(7000, 7010, "2026-07-01"),
      ...tramo(7020, 7030, "2026-07-09"),
    ]);
    expect(alertas[0].message).toContain("9 remitos (7011–7019)");
    expect(alertas[0].message).not.toContain("Probablemente falte descargar");
  });

  it("sin brechas no devuelve nada", () => {
    expect(computeAlertasInfrarutFaltante(tramo(7000, 7050, "2026-07-01"))).toEqual([]);
  });

  it("no rompe con lista vacía ni con viajes sin remito", () => {
    expect(computeAlertasInfrarutFaltante([])).toEqual([]);
    expect(
      computeAlertasInfrarutFaltante([
        { ...viaje(7000, "2026-07-01"), remito: null },
        viaje(7001, "2026-07-01"),
      ]),
    ).toEqual([]);
  });

  it("reporta varias brechas independientes", () => {
    const alertas = computeAlertasInfrarutFaltante([
      ...tramo(7000, 7010, "2026-07-01"),
      ...tramo(7020, 7030, "2026-07-03"),
      ...tramo(7100, 7110, "2026-07-05"),
    ]);
    expect(alertas).toHaveLength(2);
    // detectarBrechas ordena por cantidad de faltantes desc.
    expect(alertas[0].message).toContain("69 remitos (7031–7099)");
    expect(alertas[1].message).toContain("9 remitos (7011–7019)");
  });
});
