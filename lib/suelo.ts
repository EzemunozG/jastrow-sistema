// Análisis de suelo y plan de fertilización por lote.
//
// Los umbrales son los de referencia para CAÑA DE AZÚCAR indicados por el usuario
// (2026-08-18) y viven acá, no en la base: son criterios agronómicos generales, no un
// dato de cada lote, y así el semáforo queda versionado y con test. Si mañana el
// asesor los ajusta, se cambian en un solo lugar.
//
// Semáforo: "warn" = por debajo del óptimo, hay que corregirlo; "bad" = deficiencia
// franca. Solo el fósforo tiene los dos niveles, porque es el único parámetro para el
// que el criterio distingue "ligera insuficiencia" de estar directamente por debajo de
// ese rango. "sd" = sin dato (el informe no lo trae) — nunca se pinta como si estuviera
// bien.

export type NivelSuelo = "ok" | "warn" | "bad" | "sd";

export type EvalSuelo = {
  nivel: NivelSuelo;
  etiqueta: string; // texto corto para el chip ("bajo", "ligera insuf.", "óptimo"…)
};

export const PH_OPTIMO_MIN = 6.0;
export const PH_OPTIMO_MAX = 7.0;
export const MO_BAJO_PCT = 2.5; // MO < 2,5% = materia orgánica baja
export const N_INSUFICIENTE_PCT = 0.15; // N total < 0,150% = insuficiente
export const P_LIGERA_MIN_PPM = 13; // 13–25 ppm = ligera insuficiencia
export const P_LIGERA_MAX_PPM = 25; // > 25 ppm = suficiente
export const MG_CIC_BAJO_PCT = 15.4; // Mg/CIC < 15,4% = magnesio bajo

const SD: EvalSuelo = { nivel: "sd", etiqueta: "s/d" };

export function evalPh(ph: number | null | undefined): EvalSuelo {
  if (ph == null) return SD;
  if (ph < PH_OPTIMO_MIN) return { nivel: "warn", etiqueta: "ácido" };
  if (ph > PH_OPTIMO_MAX) return { nivel: "warn", etiqueta: "alcalino" };
  return { nivel: "ok", etiqueta: "óptimo" };
}

export function evalMo(moPct: number | null | undefined): EvalSuelo {
  if (moPct == null) return SD;
  return moPct < MO_BAJO_PCT
    ? { nivel: "warn", etiqueta: "bajo" }
    : { nivel: "ok", etiqueta: "ok" };
}

export function evalN(nPct: number | null | undefined): EvalSuelo {
  if (nPct == null) return SD;
  return nPct < N_INSUFICIENTE_PCT
    ? { nivel: "warn", etiqueta: "insuficiente" }
    : { nivel: "ok", etiqueta: "ok" };
}

export function evalP(pPpm: number | null | undefined): EvalSuelo {
  if (pPpm == null) return SD;
  if (pPpm < P_LIGERA_MIN_PPM) return { nivel: "bad", etiqueta: "insuficiente" };
  if (pPpm <= P_LIGERA_MAX_PPM)
    return { nivel: "warn", etiqueta: "ligera insuf." };
  return { nivel: "ok", etiqueta: "ok" };
}

export function evalMgCic(mgPct: number | null | undefined): EvalSuelo {
  if (mgPct == null) return SD;
  return mgPct < MG_CIC_BAJO_PCT
    ? { nivel: "warn", etiqueta: "bajo" }
    : { nivel: "ok", etiqueta: "ok" };
}

// El magnesio no se juzga por sus meq sueltos sino por qué proporción de la CIC ocupa.
// Sin CIC (o con CIC 0) no hay porcentaje que calcular → null, y el chip queda "s/d".
export function mgPctCic(
  mgMe: number | null | undefined,
  cic: number | null | undefined,
): number | null {
  if (mgMe == null || cic == null || cic <= 0) return null;
  return (mgMe / cic) * 100;
}

export type AnalisisSueloRow = {
  id: string;
  fecha: string | null;
  lote_key: string | null;
  sector: string | null;
  laboratorio: string | null;
  informe_nro: string | null;
  profundidad: string | null;
  ph: number | null;
  mo_pct: number | null;
  n_total_pct: number | null;
  p_ppm: number | null;
  cic: number | null;
  ca_me: number | null;
  mg_me: number | null;
  k_me: number | null;
  na_me: string | null;
  salinidad_ces: number | null;
  textura: string | null;
  obs: string | null;
};

export type AnalisisEvaluado = AnalisisSueloRow & {
  mg_pct_cic: number | null;
  evaluacion: {
    ph: EvalSuelo;
    mo: EvalSuelo;
    n: EvalSuelo;
    p: EvalSuelo;
    mg: EvalSuelo;
  };
};

export function evaluarAnalisis(a: AnalisisSueloRow): AnalisisEvaluado {
  const mgPct = mgPctCic(a.mg_me, a.cic);
  return {
    ...a,
    mg_pct_cic: mgPct,
    evaluacion: {
      ph: evalPh(a.ph),
      mo: evalMo(a.mo_pct),
      n: evalN(a.n_total_pct),
      p: evalP(a.p_ppm),
      mg: evalMgCic(mgPct),
    },
  };
}

// ── Plan de fertilización ────────────────────────────────────────────────────

// El total_kg del plan NO se recalcula en el front: viene calculado en el dato (dosis ×
// surcos totales del lote, con los surcos reales que midió el que armó el plan). Lo que
// sí se hace es mostrar al lado la misma cuenta con los surcos que tiene cargados el
// sistema (ha × surcos_por_ha de lotes_ingenio) y avisar si se despega más de un 5%:
// mientras los surcos/ha sean el placeholder de 61 parejo para todos los lotes (ver
// surcosEstimados() en lib/lot-map.ts), esa diferencia es justamente la señal de que
// los surcos del lote están sin medir. Cuando se carguen los reales, la advertencia se
// apaga sola.
export const TOLERANCIA_TOTAL_KG = 0.05;

export type PlanFertilizacionRow = {
  id: string;
  campania: string | null;
  lote_key: string | null;
  producto: string | null;
  dosis_kg_surco: number | null;
  total_kg: number | null;
  ventana: string | null;
  estado: string;
  obs: string | null;
};

export type ChequeoSurcos = {
  surcos: number | null; // ha × surcos_por_ha del lote, null si no se conoce
  total_calculado: number | null; // dosis × surcos
  desvio_pct: number | null; // |calculado − guardado| / guardado, en %
  advertencia: boolean; // desvío > TOLERANCIA_TOTAL_KG
};

export function chequearTotalPlan(params: {
  dosisKgSurco: number | null | undefined;
  totalKgGuardado: number | null | undefined;
  ha: number | null | undefined;
  surcosPorHa: number | null | undefined;
}): ChequeoSurcos {
  const { dosisKgSurco, totalKgGuardado, ha, surcosPorHa } = params;
  const surcos =
    ha != null && ha > 0 && surcosPorHa != null && surcosPorHa > 0
      ? ha * surcosPorHa
      : null;
  const calculado =
    surcos != null && dosisKgSurco != null ? dosisKgSurco * surcos : null;

  // Sin total guardado (o en 0) no hay contra qué comparar: se muestra la cuenta pero
  // no se avisa nada — un 0 dividendo daría Infinity y una advertencia siempre.
  if (calculado == null || totalKgGuardado == null || totalKgGuardado === 0) {
    return {
      surcos,
      total_calculado: calculado,
      desvio_pct: null,
      advertencia: false,
    };
  }

  const desvio = Math.abs(calculado - totalKgGuardado) / Math.abs(totalKgGuardado);
  return {
    surcos,
    total_calculado: calculado,
    desvio_pct: desvio * 100,
    advertencia: desvio > TOLERANCIA_TOTAL_KG,
  };
}

// ── Agrupado por lote para la pantalla de Suelos ─────────────────────────────

export type PlanEvaluado = PlanFertilizacionRow & { chequeo: ChequeoSurcos };

export type LoteSuelo = {
  lote_key: string;
  nombre: string;
  ha: number | null;
  surcos_por_ha: number | null;
  analisis: AnalisisEvaluado[];
  plan: PlanEvaluado[];
};

// Un lote entra si tiene al menos un análisis o una línea de plan. Los lotes sin nada
// cargado no se listan (serían filas vacías); el lote_key que no esté declarado en
// lotes_ingenio entra igual, con nombre = su propia key y sin ha/surcos (la columna de
// la cuenta queda en "—" en vez de desaparecer el plan).
export function computeSuelos(params: {
  analisis: AnalisisSueloRow[];
  planes: PlanFertilizacionRow[];
  lotesIngenio: {
    lote_key: string;
    nombre: string;
    ha: number | null;
    surcos_por_ha: number | null;
  }[];
}): LoteSuelo[] {
  const { analisis, planes, lotesIngenio } = params;
  const meta = new Map(lotesIngenio.map((l) => [l.lote_key, l]));

  const keys = new Set<string>();
  for (const a of analisis) if (a.lote_key) keys.add(a.lote_key);
  for (const p of planes) if (p.lote_key) keys.add(p.lote_key);

  return [...keys]
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((key) => {
      const m = meta.get(key);
      return {
        lote_key: key,
        nombre: m?.nombre ?? key,
        ha: m?.ha ?? null,
        surcos_por_ha: m?.surcos_por_ha ?? null,
        analisis: analisis
          .filter((a) => a.lote_key === key)
          .sort(
            (a, b) =>
              (b.fecha ?? "").localeCompare(a.fecha ?? "") ||
              (a.sector ?? "").localeCompare(b.sector ?? "", "es"),
          )
          .map(evaluarAnalisis),
        plan: planes
          .filter((p) => p.lote_key === key)
          .map((p) => ({
            ...p,
            chequeo: chequearTotalPlan({
              dosisKgSurco: p.dosis_kg_surco,
              totalKgGuardado: p.total_kg,
              ha: m?.ha ?? null,
              surcosPorHa: m?.surcos_por_ha ?? null,
            }),
          })),
      };
    });
}

// Slug estable para el ancla de cada lote en /suelos ("LAS 101" → "lote-las-101"). El
// chip "Fert. pendiente" del mapa linkea acá.
export function anclaLote(loteKey: string): string {
  return `lote-${loteKey
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

// Estado que marca una línea de plan como todavía pendiente de aplicar. Es el default
// de la columna (ver 20260818000001_suelos.sql) y lo que dispara el chip del mapa.
export const ESTADO_PLANIFICADO = "planificado";
