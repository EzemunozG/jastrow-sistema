// Reglas de alerta portadas de index_10.html:3113-3190 (renderAlertas), generalizadas
// de "2 fincas hardcodeadas" a N lotes por ingenio (decisión confirmada por el
// usuario, 2026-07-28): la meta de Rdto% (10,0%) es la misma para todos los lotes de
// ambos ingenios, y cada regla se evalúa por lote — computeAlerts() se llama una vez
// por ingenio (mismo patrón que rendimientoPorLote en las páginas de Rendimiento y
// Reconciliación), no agrupa por ingenio acá adentro; eso lo hace la página.
import {
  INGENIOS,
  META,
  UMBRALES,
  avg,
  contarSinFecha,
  fechasUnicas,
  statsFor,
  sum,
  type InfrarutRow,
} from "./business-rules";
import { compactarRangos, formatNumber, formatPercent, formatTn } from "./format";
import {
  detectarBrechas,
  libretaStatus,
  reconciliar,
  type BajaArcaRow,
  type CpCampoRow,
  type LoteIngenioRow,
} from "./reconciliation";

export type Alert = {
  severity: "bad" | "warn" | "info";
  icon: string; // nombre de ícono Tabler, ej. "trending-down"
  message: string;
  lote_key?: string; // lote al que pertenece; undefined = alerta a nivel ingenio
};

function fmt(fecha: string | null): string {
  if (!fecha) return "—";
  return fecha.slice(5).split("-").reverse().join("/");
}

function peoresRemitos(rows: InfrarutRow[]): string {
  return [...rows]
    .sort((a, b) => a.rdto - b.rdto)
    .slice(0, 2)
    .map((r) => `remito ${r.remito ?? "s/rem"} (${formatPercent(r.rdto)})`)
    .join(" y ");
}

// Viajes reconciliados (libreta cruzada con INFRARUT por remito, ver reconciliar())
// agrupados por lote de origen. Mismo cruce que rendimientoPorLote() en
// reconciliation.ts, pero acá hace falta el detalle día por día (no el agregado de
// todo el período), así que no se puede reutilizar esa función tal cual.
function infrarutsPorLote(
  cpsCampo: CpCampoRow[],
  infraruts: InfrarutRow[],
  bajas: BajaArcaRow[],
  lotesIngenio: LoteIngenioRow[],
): { lote_key: string; nombre: string; rows: InfrarutRow[] }[] {
  const { reconciliados, infrarutPorRemito } = reconciliar(cpsCampo, infraruts, bajas);
  const porLoteKey = new Map<string, InfrarutRow[]>();
  for (const x of reconciliados) {
    if (!x.lote) continue;
    const inf = infrarutPorRemito.get(x.cp);
    if (!inf) continue;
    if (!porLoteKey.has(x.lote)) porLoteKey.set(x.lote, []);
    porLoteKey.get(x.lote)!.push(inf);
  }
  const result: { lote_key: string; nombre: string; rows: InfrarutRow[] }[] = [];
  for (const meta of lotesIngenio) {
    const rows = porLoteKey.get(meta.lote_key);
    if (rows && rows.length > 0)
      result.push({ lote_key: meta.lote_key, nombre: meta.nombre, rows });
  }
  return result;
}

// Alertas de UN ingenio (cpsCampo/infraruts/lotesIngenio ya filtrados a ese
// ingenio_id). Reglas por lote + reglas a nivel ingenio (reconciliación pendiente,
// antigüedad de datos) — ver computeAlertaBajas() aparte para bajas ARCA, que no
// tiene ingenio_id y por eso no puede vivir acá adentro.
export function computeAlerts(
  cpsCampo: CpCampoRow[],
  infraruts: InfrarutRow[],
  bajas: BajaArcaRow[],
  lotesIngenio: LoteIngenioRow[],
  hoy: Date = new Date(),
): Alert[] {
  const alerts: Alert[] = [];
  const lotes = infrarutsPorLote(cpsCampo, infraruts, bajas, lotesIngenio);

  // "Todos los lotes cayeron el mismo día" — corrige un bug del legacy, que decía
  // "ambas fincas cayeron" con solo chequear que ALGUNA hubiera caído (con 2 fincas
  // hardcodeadas nunca se notó). Ahora se cuenta de verdad sobre los lotes con datos
  // comparables (ambos días) de este ingenio.
  let lotesComparables = 0;
  let lotesQueCaen = 0;

  for (const { lote_key, nombre, rows } of lotes) {
    // Todas las reglas de acá abajo son "por día": comparan el último día con datos
    // contra el anterior. Los viajes sin fecha transcripta no pertenecen a ningún
    // día, así que no participan (fechasUnicas los descarta). Si un lote SOLO tiene
    // viajes sin fecha no hay nada que comparar todavía — se saltea sin alertas y
    // sin romper (statsFor de un array vacío devuelve null).
    const fechasLote = fechasUnicas(rows);
    if (fechasLote.length === 0) continue;
    const lastF = fechasLote[fechasLote.length - 1];
    // "Día anterior" = día anterior CON DATOS para este lote, no día calendario.
    const prevF = fechasLote.length > 1 ? fechasLote[fechasLote.length - 2] : null;
    const lastRows = rows.filter((r) => r.fecha === lastF);
    const last = statsFor(lastRows)!;
    const prev = prevF ? statsFor(rows.filter((r) => r.fecha === prevF)) : null;

    // Caída de Rdto% vs día anterior con datos
    if (prev) {
      lotesComparables++;
      const delta = last.rdto - prev.rdto;
      if (delta < -0.3) {
        lotesQueCaen++;
        alerts.push({
          severity: "bad",
          lote_key,
          icon: "trending-down",
          message: `${nombre}: caída de ${formatNumber(Math.abs(delta), 2)} pp de Rdto% vs día anterior (${formatPercent(prev.rdto)} → ${formatPercent(last.rdto)}, ${fmt(prevF)} → ${fmt(lastF)}). Verificar madurez del sector, regulación de cosechadora y lluvias previas.`,
        });
      }
    }

    // Rdto% bajo la meta (último día) — meta única (10,0%) para todos los lotes
    if (last.rdto < META) {
      alerts.push({
        severity: "bad",
        lote_key,
        icon: "alert-circle",
        message: `${nombre} bajo la meta el ${fmt(lastF)}: ${formatPercent(last.rdto)} vs meta ${formatPercent(META, 1)}${prev ? ` (día anterior: ${formatPercent(prev.rdto)})` : ""}. Viajes más críticos: ${peoresRemitos(lastRows) || "—"}.`,
      });
    }

    // Pureza crítica (último día)
    if (last.pureza < UMBRALES.purezaCritica) {
      alerts.push({
        severity: "bad",
        lote_key,
        icon: "droplet-off",
        message: `Pureza crítica en ${nombre}: ${formatPercent(last.pureza)} promedio (mín. recomendado: ${formatPercent(UMBRALES.purezaWarn, 0)}). Indica azúcares reductores, material vegetal o caña deteriorada.`,
      });
    }

    // Caída de POL en un día
    if (prev) {
      const deltaPol = last.pol - prev.pol;
      if (deltaPol < -0.5) {
        alerts.push({
          severity: "warn",
          lote_key,
          icon: "droplet",
          message: `POL cayó ${formatNumber(Math.abs(deltaPol), 2)} pp en ${nombre} en un solo día (${formatPercent(prev.pol)} → ${formatPercent(last.pol)}). Posibles causas: lluvia reciente, sector menos maduro o caña más joven.`,
        });
      }
    }

    // Trash alto (último día)
    if (last.trash_pct > UMBRALES.trashAlerta) {
      alerts.push({
        severity: "warn",
        lote_key,
        icon: "leaf",
        message: `Trash alto en ${nombre}: ${formatPercent(last.trash_pct)} el ${fmt(lastF)}. Revisar regulación de extractores de la cosechadora.`,
      });
    }

    // Tendencia acumulada: primeros 3 días vs últimos 3 días CON DATOS para este lote
    if (fechasLote.length >= 4) {
      const diasStats = fechasLote.map(
        (f) => statsFor(rows.filter((r) => r.fecha === f))!,
      );
      const ini = avg(diasStats.slice(0, 3), (x) => x.rdto);
      const fin = avg(diasStats.slice(-3), (x) => x.rdto);
      const delta = fin - ini;
      if (Math.abs(delta) < 0.15) {
        alerts.push({
          severity: "info",
          lote_key,
          icon: "chart-line",
          message: `${nombre}: rendimiento estable (${formatPercent(ini)} → ${formatPercent(fin)} comparando primeros y últimos 3 días).`,
        });
      } else {
        alerts.push({
          severity: "info",
          lote_key,
          icon: "chart-line",
          message: `${nombre}: tendencia ${delta > 0 ? "positiva ▲" : "negativa ▼"} de ${delta > 0 ? "+" : ""}${formatNumber(delta, 2)} pp (${formatPercent(ini)} → ${formatPercent(fin)}).`,
        });
      }
    }
  }

  if (lotesComparables > 0 && lotesQueCaen === lotesComparables) {
    alerts.push({
      severity: "info",
      icon: "trending-down",
      message:
        "Todos los lotes con datos comparables cayeron el mismo día — puede apuntar a un factor externo común: lluvia, cambio de sector o condición del ingenio.",
    });
  }

  // ---- Reglas a nivel ingenio ----
  const { pendientes } = reconciliar(cpsCampo, infraruts, bajas);
  if (pendientes.length > 0) {
    alerts.push({
      severity: "warn",
      icon: "file-alert",
      message: `${pendientes.length} despacho${pendientes.length !== 1 ? "s" : ""} de la libreta sin reconciliar: ${pendientes
        .slice(0, 8)
        .map((x) => "remito " + x.cp)
        .join(", ")}${pendientes.length > 8 ? "…" : ""}. Verificar si falta cargar el INFRARUT correspondiente o reclamar al ingenio.`,
    });
  }

  // Viajes que el ingenio reportó pero que no están en la libreta del campo. Es
  // `warn`, no `info`: son trabajo de transcripción pendiente Y un agujero en los
  // números — sin entrada de libreta no hay `lote`, así que esos kilos no entran en
  // rendimientoPorLote() ni en el desglose por lote de Reconciliación.
  // Se usa libretaStatus() (mismo criterio que la card "Sin manual" de
  // /viajes/reconciliacion, para que los dos números coincidan): eso incluye los
  // INFRARUT sin número de remito y excluye las bajas ARCA, que están anuladas y no
  // hay nada que transcribir de ellas.
  const cpsCampoSet = new Set(cpsCampo.map((x) => x.cp));
  const bajasSet = new Set(bajas.map((b) => b.cp));
  const sinLibreta = infraruts.filter(
    (r) => libretaStatus(r, cpsCampoSet, bajasSet) === "sin_manual",
  );
  if (sinLibreta.length > 0) {
    const n = sinLibreta.length;
    const tn = sum(sinLibreta, (r) => r.kg_neto) / 1000;
    const sinFechaEnGrupo = contarSinFecha(sinLibreta);
    const remitos = sinLibreta
      .filter((r) => r.remito != null)
      .map((r) => r.remito as number);
    const sinRemito = n - remitos.length;
    alerts.push({
      severity: "warn",
      icon: "notebook",
      message:
        `${n} viaje${n !== 1 ? "s" : ""} del INFRARUT sin entrada en la libreta (${formatTn(tn)} netas` +
        `${sinFechaEnGrupo > 0 ? `, de los cuales ${sinFechaEnGrupo} sin fecha` : ""}): ` +
        `remito${remitos.length !== 1 ? "s" : ""} ${compactarRangos(remitos)}` +
        `${sinRemito > 0 ? ` (+${sinRemito} sin número de remito)` : ""}. ` +
        `Sin entrada de libreta no hay lote al cual atribuir esos kilos. ` +
        `Transcribir estos remitos de la libreta física (fecha + lote) para completar el rendimiento por lote.`,
    });
  }

  // Sin fecha PERO ya transcriptos en la libreta: el caso que la alerta de arriba no
  // cubre. Hoy este conjunto está vacío (los 36 sin fecha de Trinidad tampoco están
  // en la libreta), y por eso no se avisa dos veces lo mismo; pero las dos cosas son
  // independientes — la fecha de infraruts la carga el INFRARUT y la entrada de
  // libreta la carga el campo, así que un viaje puede tener libreta y seguir sin
  // fecha, y ahí este aviso es lo único que explica por qué no aparece en Tendencia.
  const sinLibretaSet = new Set(sinLibreta);
  const sinFechaConLibreta = infraruts.filter(
    (r) => r.fecha == null && !sinLibretaSet.has(r),
  );
  if (sinFechaConLibreta.length > 0) {
    const n = sinFechaConLibreta.length;
    alerts.push({
      severity: "info",
      icon: "calendar-question",
      message: `${n} viaje${n !== 1 ? "s" : ""} con entrada en la libreta pero sin fecha de salida cargada. Suman en los totales y en el rendimiento por lote, pero no aparecen en Tendencia ni en las comparaciones por día hasta que se les cargue la fecha.`,
    });
  }

  // "Antigüedad de datos" mira el último día CON fecha: los viajes sin fecha no
  // dicen nada sobre cuándo se cargó el último INFRARUT.
  const fechasIngenio = fechasUnicas(infraruts);
  if (fechasIngenio.length > 0) {
    const lastF = fechasIngenio[fechasIngenio.length - 1];
    const diasDesde = Math.floor(
      (hoy.getTime() - new Date(lastF).getTime()) / 86400000,
    );
    if (diasDesde >= 3) {
      alerts.push({
        severity: "warn",
        icon: "file-upload",
        message: `Último INFRARUT cargado: ${fmt(lastF)} (hace ${diasDesde} días). Revisá si hay reportes del ingenio pendientes de subir.`,
      });
    } else {
      alerts.push({
        severity: "info",
        icon: "file-upload",
        message:
          "Seguí cargando los INFRARUTs diarios. El sistema acumula automáticamente cada archivo y actualiza las alertas.",
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      severity: "info",
      icon: "circle-check",
      message:
        "Sin alertas activas. Todos los indicadores dentro de los parámetros esperados.",
    });
  }

  return alerts;
}

// ============================================================================
// POSIBLE INFRARUT FALTANTE
// ============================================================================

// El talonario de remitos es UNO SOLO para todo el campo: el mismo librito se usa
// despachando a Concepción o a Trinidad (ver lib/reconciliation.ts). Por eso un hueco
// en la secuencia de UN ingenio casi nunca significa que falte algo — normalmente son
// los viajes que ese día salieron al otro ingenio. El agujero real es el hueco en la
// secuencia GLOBAL: números que no reportó ninguno de los dos. Detectarlo es
// exactamente correr detectarBrechas() sobre la unión de los dos ingenios.
export const BRECHA_MIN_ALERTABLE = 3;

// Los remitos de otro punto de venta (talonario 0014-: 10129, 10190, 10191) son una
// serie aparte de la principal (0004-). Mezclarlas inventaría una brecha de ~2.700
// números entre 7389 y 10129, que taparía todo lo demás. La detección corre solo
// sobre la serie principal; la 0014- tiene 3 remitos sueltos y demasiados huecos
// propios como para que alertar sobre ella diga algo útil.
export const REMITO_SERIE_PRINCIPAL_MAX = 10000;

export type AlertaIngenio = Alert & {
  // A qué ingenio se le atribuye la brecha (el de los remitos vecinos). Una brecha
  // entre remitos de ingenios distintos no se puede atribuir a uno solo, y se emite
  // para los dos: los números faltantes pudieron salir a cualquiera de ellos.
  ingenio_id: string;
};

// "2026-08-05" + "2026-08-07" → "2026-08-06". Solo cuando falta exactamente un día
// entre medio: ahí el hueco tiene una explicación concreta y accionable ("no se
// descargó el archivo de ese día"). Con más días de diferencia no se adivina cuál.
function diaFaltanteEntre(fechaAnt: string | null, fechaSig: string | null): string | null {
  if (!fechaAnt || !fechaSig) return null;
  const ant = new Date(`${fechaAnt}T00:00:00Z`).getTime();
  const sig = new Date(`${fechaSig}T00:00:00Z`).getTime();
  if (sig - ant !== 2 * 86400000) return null;
  return new Date(ant + 86400000).toISOString().slice(0, 10);
}

function nombreIngenio(id: string | undefined): string {
  return INGENIOS.find((i) => i.id === id)?.nombre ?? id ?? "—";
}

// Brechas en la secuencia global de remitos = INFRARUTs que probablemente no se
// descargaron del portal del ingenio. Recibe los viajes de TODOS los ingenios (no los
// de uno solo, que es justo el error que haría saltar falsos positivos) y devuelve
// cada alerta etiquetada con el ingenio al que corresponde, para que /alertas la
// muestre en la sección que va.
export function computeAlertasInfrarutFaltante(
  infraruts: InfrarutRow[],
  minFaltantes: number = BRECHA_MIN_ALERTABLE,
): AlertaIngenio[] {
  const seriePrincipal = infraruts.filter(
    (r) => r.remito != null && r.remito < REMITO_SERIE_PRINCIPAL_MAX,
  );
  const porRemito = new Map(seriePrincipal.map((r) => [r.remito as number, r]));

  const alertas: AlertaIngenio[] = [];
  for (const gap of detectarBrechas(seriePrincipal)) {
    // Huecos de 1–2 números son el ruido normal del talonario (un remito anulado, uno
    // mal escrito). Un INFRARUT diario que no se descargó se lleva una jornada entera.
    if (gap.faltantes < minFaltantes) continue;

    const antes = porRemito.get(gap.desde);
    const despues = porRemito.get(gap.hasta);
    const rango =
      gap.faltantes === 1 ? `${gap.desde + 1}` : `${gap.desde + 1}–${gap.hasta - 1}`;
    const dia = diaFaltanteEntre(gap.fechaAnt, gap.fechaSig);
    const mismoIngenio = antes?.ingenio_id === despues?.ingenio_id;

    const ubicacion = mismoIngenio
      ? `entre el ${fmt(gap.fechaAnt)} (remito ${gap.desde}) y el ${fmt(gap.fechaSig)} (remito ${gap.hasta})`
      : `entre el remito ${gap.desde} (${nombreIngenio(antes?.ingenio_id)}, ${fmt(gap.fechaAnt)}) y el remito ${gap.hasta} (${nombreIngenio(despues?.ingenio_id)}, ${fmt(gap.fechaSig)})`;

    const message =
      `Posible INFRARUT faltante: ${gap.faltantes} remito${gap.faltantes !== 1 ? "s" : ""} (${rango}) ${ubicacion}. ` +
      `No los reportó ninguno de los dos ingenios, así que no es que hayan salido al otro: falta el archivo.` +
      (dia ? ` Probablemente falte descargar el INFRARUT del ${fmt(dia)}.` : "") +
      ` Revisá el portal del ingenio y subilo desde Resumen.`;

    // Sin vecinos identificables no hay a quién atribuirle la brecha (no debería
    // pasar: los dos extremos salen de porRemito), pero no se inventa un ingenio.
    const ingenios = [...new Set([antes?.ingenio_id, despues?.ingenio_id])].filter(
      (id): id is string => id != null,
    );
    for (const ingenio_id of ingenios) {
      alertas.push({ severity: "warn", icon: "file-download", message, ingenio_id });
    }
  }
  return alertas;
}

// Bajas ARCA sin gestionar — bajas_arca no tiene ingenio_id (es el talonario único
// del campo, ver comentario en app/(app)/viajes/reconciliacion/page.tsx), así que no
// se puede atribuir a un ingenio: se calcula una sola vez y se muestra aparte de las
// dos secciones por ingenio en /alertas.
export function computeAlertaBajas(bajas: BajaArcaRow[]): Alert | null {
  const pendientes = bajas.filter((b) => !b.gestionado);
  if (pendientes.length === 0) return null;
  return {
    severity: "bad",
    icon: "file-x",
    message: `${pendientes.length} baja${pendientes.length !== 1 ? "s" : ""} ARCA pendiente${pendientes.length !== 1 ? "s" : ""} de gestión: ${pendientes.map((b) => "remito " + b.cp).join(", ")}. Recordá dar de baja estas cartas de porte.`,
  };
}
