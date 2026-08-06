// Un INFRARUT puede llegar sin fecha de salida: el ingenio confirma el viaje y la
// calidad, pero la fecha vive en la libreta física y se transcribe después (ver
// supabase/migrations/20260806000000_infraruts_fecha_nullable.sql). La regla que
// estos tests protegen: esos viajes SUMAN en todo lo que no sea un corte por día, y
// nunca rompen ni ensucian los cálculos que sí lo son.
import { describe, expect, it } from "vitest";
import {
  contarSinFecha,
  fechasUnicas,
  statsFor,
  type InfrarutRow,
} from "./business-rules";
import { enRangoFecha } from "./filters";
import { computeAlerts } from "./alerts";
import {
  detectarBrechas,
  rendimientoPorLote,
  type BajaArcaRow,
  type CpCampoRow,
  type LoteIngenioRow,
} from "./reconciliation";

function viaje(
  remito: number,
  fecha: string | null,
  extra: Partial<InfrarutRow> = {},
): InfrarutRow {
  return {
    cp: remito + 100000,
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

function libreta(remitos: number[]): CpCampoRow[] {
  return remitos.map((cp) => ({
    cp,
    ingenio_id: "trinidad",
    fecha: null,
    camion: null,
    obs: null,
    lote: "FRAU",
  }));
}

describe("fechasUnicas / contarSinFecha", () => {
  const rows = [viaje(1, "2026-08-01"), viaje(2, null), viaje(3, "2026-08-01")];

  it("los días con datos no incluyen a los viajes sin fecha", () => {
    expect(fechasUnicas(rows)).toEqual(["2026-08-01"]);
  });

  it("los viajes sin fecha se cuentan aparte, no se pierden", () => {
    expect(contarSinFecha(rows)).toBe(1);
  });
});

describe("enRangoFecha", () => {
  it("un viaje sin fecha nunca se filtra por rango", () => {
    expect(enRangoFecha(null, "2026-08-01", "2026-08-02")).toBe(true);
  });

  it("sigue filtrando normal cuando hay fecha", () => {
    expect(enRangoFecha("2026-07-30", "2026-08-01", "")).toBe(false);
    expect(enRangoFecha("2026-08-01", "2026-08-01", "2026-08-02")).toBe(true);
  });
});

describe("statsFor con viajes sin fecha", () => {
  it("los kg y el azúcar suman igual", () => {
    const s = statsFor([viaje(1, "2026-08-01"), viaje(2, null)])!;
    expect(s.n).toBe(2);
    expect(s.kg_neto).toBe(60000);
    expect(s.kg_azucar).toBe(6000);
  });
});

describe("rendimientoPorLote con viajes sin fecha", () => {
  it("el lote acumula los kg de los viajes sin fecha", () => {
    const [frau] = rendimientoPorLote(
      libreta([1, 2]),
      [viaje(1, "2026-08-01"), viaje(2, null)],
      SIN_BAJAS,
      LOTES,
    );
    expect(frau.n).toBe(2);
    expect(frau.kg_neto_total).toBe(60000);
  });
});

describe("detectarBrechas con fechas nulas", () => {
  it("reporta la brecha pero no la marca como probable sin las dos fechas", () => {
    const gaps = detectarBrechas([viaje(1, null), viaje(10, "2026-08-02")]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].faltantes).toBe(8);
    expect(gaps[0].fechaAnt).toBeNull();
    // 8 faltantes alcanzarían para "probable", pero sin fechaAnt no se puede
    // afirmar que haya cambio de día.
    expect(gaps[0].probable).toBe(false);
  });

  it("sigue marcando probable cuando las dos fechas están y son distintas", () => {
    const gaps = detectarBrechas([viaje(1, "2026-08-01"), viaje(10, "2026-08-02")]);
    expect(gaps[0].probable).toBe(true);
  });
});

describe("computeAlerts con viajes sin fecha", () => {
  it("avisa cuántos viajes están sin fecha transcripta", () => {
    const alerts = computeAlerts(
      libreta([1, 2, 3]),
      [viaje(1, "2026-08-01"), viaje(2, null), viaje(3, null)],
      SIN_BAJAS,
      LOTES,
      new Date("2026-08-02T00:00:00Z"),
    );
    expect(alerts.some((a) => /2 viajes .*sin fecha/.test(a.message))).toBe(true);
  });

  it("no compara contra un 'último día' inventado a partir de los nulos", () => {
    // El único día con datos es el 01, con rdto 10.5 (sobre la meta): no debe salir
    // ninguna alerta de rendimiento bajo por culpa de los viajes sin fecha.
    const alerts = computeAlerts(
      libreta([1, 2]),
      [viaje(1, "2026-08-01"), viaje(2, null, { rdto: 4 })],
      SIN_BAJAS,
      LOTES,
      new Date("2026-08-02T00:00:00Z"),
    );
    expect(alerts.some((a) => a.message.includes("bajo la meta"))).toBe(false);
  });

  it("un lote con TODOS los viajes sin fecha no rompe (se saltea sin alertas)", () => {
    const alerts = computeAlerts(
      libreta([1, 2]),
      [viaje(1, null), viaje(2, null)],
      SIN_BAJAS,
      LOTES,
      new Date("2026-08-02T00:00:00Z"),
    );
    expect(alerts.some((a) => a.message.includes("Frau"))).toBe(false);
    expect(alerts.some((a) => /sin fecha/.test(a.message))).toBe(true);
  });
});
