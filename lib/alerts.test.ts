// Alerta "viajes sin entrada de libreta": el ingenio reportó el viaje pero el campo
// no lo tiene anotado, así que no hay lote al cual atribuir esos kilos y quedan
// fuera del rendimiento por lote. Es la contracara de "despachos sin reconciliar"
// (esos sí están en la libreta y el ingenio no los reportó).
import { describe, expect, it } from "vitest";
import { computeAlerts } from "./alerts";
import type { InfrarutRow } from "./business-rules";
import { compactarRangos } from "./format";
import type { BajaArcaRow, CpCampoRow, LoteIngenioRow } from "./reconciliation";

function viaje(
  remito: number | null,
  fecha: string | null,
  extra: Partial<InfrarutRow> = {},
): InfrarutRow {
  return {
    cp: (remito ?? 0) + 100000,
    ingenio_id: "trinidad",
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
    ...extra,
  };
}

function libreta(remitos: number[]): CpCampoRow[] {
  return remitos.map((cp) => ({
    cp,
    ingenio_id: "trinidad",
    fecha: "2026-08-01",
    camion: null,
    obs: null,
    lote: "FRAU",
  }));
}

const LOTES: LoteIngenioRow[] = [
  {
    id: "l1",
    nombre: "Frau",
    ingenio_id: "trinidad",
    lote_key: "FRAU",
    ha: 10,
    surcos_por_ha: 60,
  },
];
const SIN_BAJAS: BajaArcaRow[] = [];
const HOY = new Date("2026-08-02T00:00:00Z");

function alertaSinLibreta(
  cps: CpCampoRow[],
  infraruts: InfrarutRow[],
  bajas: BajaArcaRow[] = SIN_BAJAS,
) {
  return computeAlerts(cps, infraruts, bajas, LOTES, HOY).find((a) =>
    a.message.includes("sin entrada en la libreta"),
  );
}

describe("compactarRangos", () => {
  it("colapsa las corridas consecutivas y deja sueltos los aislados", () => {
    // El caso real de Trinidad al 2026-08-06.
    const remitos = [
      7118,
      7166,
      7167,
      7168,
      7200,
      ...Array.from({ length: 31 }, (_, i) => 7226 + i), // 7226–7256
      7301,
      7302,
      7303,
      7304,
    ];
    expect(compactarRangos(remitos)).toBe(
      "7118, 7166–7168, 7200, 7226–7256, 7301–7304",
    );
  });

  it("ordena y deduplica la entrada", () => {
    expect(compactarRangos([9, 7, 8, 7, 1])).toBe("1, 7–9");
  });

  it("una corrida de dos también se escribe como rango", () => {
    expect(compactarRangos([4, 5])).toBe("4–5");
  });

  it("corta con … cuando hay demasiados grupos sueltos", () => {
    const sueltos = Array.from({ length: 15 }, (_, i) => i * 2); // 15 grupos de 1
    expect(compactarRangos(sueltos, 3)).toBe("0, 2, 4 … (+12 más)");
  });

  it("no rompe con una lista vacía", () => {
    expect(compactarRangos([])).toBe("");
  });
});

describe("computeAlerts — viajes sin entrada de libreta", () => {
  it("caso con huecos: avisa cantidad, tonelaje y remitos por rango", () => {
    const a = alertaSinLibreta(
      libreta([7117]),
      [
        viaje(7117, "2026-08-01"), // en libreta, no cuenta
        viaje(7118, "2026-08-01"),
        viaje(7166, "2026-08-01"),
        viaje(7167, "2026-08-01"),
        viaje(7168, "2026-08-01"),
      ],
    );
    expect(a).toBeDefined();
    expect(a!.severity).toBe("warn");
    expect(a!.message).toContain("4 viajes del INFRARUT sin entrada en la libreta");
    expect(a!.message).toContain("120,0 tn netas"); // 4 × 30.000 kg
    expect(a!.message).toContain("remitos 7118, 7166–7168");
    expect(a!.message).toContain(
      "Transcribir estos remitos de la libreta física (fecha + lote) para completar el rendimiento por lote.",
    );
  });

  it("caso sin huecos: la alerta no aparece", () => {
    const a = alertaSinLibreta(libreta([1, 2, 3]), [
      viaje(1, "2026-08-01"),
      viaje(2, "2026-08-01"),
      viaje(3, "2026-08-01"),
    ]);
    expect(a).toBeUndefined();
  });

  it("caso mixto: aclara cuántos de los que faltan están además sin fecha", () => {
    const a = alertaSinLibreta(libreta([]), [
      viaje(7118, "2026-08-01"),
      viaje(7200, null),
      viaje(7226, null),
    ]);
    expect(a!.message).toContain("3 viajes del INFRARUT sin entrada en la libreta");
    expect(a!.message).toContain("de los cuales 2 sin fecha");
    expect(a!.message).toContain("remitos 7118, 7200, 7226");
  });

  it("sin ninguno sin fecha, no agrega la coletilla", () => {
    const a = alertaSinLibreta(libreta([]), [viaje(7118, "2026-08-01")]);
    expect(a!.message).toContain("1 viaje del INFRARUT sin entrada en la libreta");
    expect(a!.message).not.toContain("sin fecha");
    expect(a!.message).toContain("remito 7118"); // singular
  });

  it("un INFRARUT sin número de remito se cuenta pero se lista aparte", () => {
    const a = alertaSinLibreta(libreta([]), [viaje(7118, "2026-08-01"), viaje(null, "2026-08-01")]);
    expect(a!.message).toContain("2 viajes del INFRARUT sin entrada en la libreta");
    expect(a!.message).toContain("(+1 sin número de remito)");
  });

  it("las bajas ARCA no cuentan como transcripción pendiente", () => {
    // Una baja está anulada: no hay nada que transcribir de ella. Mismo criterio que
    // la card "Sin manual" de /viajes/reconciliacion (libretaStatus).
    const a = alertaSinLibreta(libreta([]), [viaje(7118, "2026-08-01")], [
      { cp: 7118, gestionado: false },
    ]);
    expect(a).toBeUndefined();
  });
});

describe("computeAlerts — no duplicar el aviso de 'sin fecha'", () => {
  const sinFechaInfo = (alerts: { message: string }[]) =>
    alerts.filter((a) => a.message.includes("sin fecha de salida cargada"));

  it("si los sin fecha tampoco están en la libreta, solo avisa la alerta de libreta", () => {
    const alerts = computeAlerts(
      libreta([]),
      [viaje(7200, null), viaje(7201, null)],
      SIN_BAJAS,
      LOTES,
      HOY,
    );
    expect(sinFechaInfo(alerts)).toHaveLength(0);
    expect(alerts.some((a) => a.message.includes("de los cuales 2 sin fecha"))).toBe(
      true,
    );
  });

  it("un viaje con libreta pero sin fecha sí tiene su propio aviso", () => {
    // Caso que la alerta de libreta no cubre: alguien transcribió el despacho pero
    // el INFRARUT llegó sin fecha. Sigue quedando fuera de Tendencia.
    const alerts = computeAlerts(
      libreta([7200]),
      [viaje(7200, null)],
      SIN_BAJAS,
      LOTES,
      HOY,
    );
    expect(alertaSinLibreta(libreta([7200]), [viaje(7200, null)])).toBeUndefined();
    expect(sinFechaInfo(alerts)).toHaveLength(1);
    expect(sinFechaInfo(alerts)[0].message).toContain("1 viaje con entrada en la libreta");
  });
});
