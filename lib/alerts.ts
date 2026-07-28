// Reglas de alerta portadas de index_10.html:3113-3190 (renderAlertas), generalizadas
// de "2 fincas hardcodeadas" a N lotes por ingenio (decisión confirmada por el
// usuario, 2026-07-28): la meta de Rdto% (10,0%) es la misma para todos los lotes de
// ambos ingenios, y cada regla se evalúa por lote — computeAlerts() se llama una vez
// por ingenio (mismo patrón que rendimientoPorLote en las páginas de Rendimiento y
// Reconciliación), no agrupa por ingenio acá adentro; eso lo hace la página.
import { META, UMBRALES, avg, statsFor, type InfrarutRow } from "./business-rules";
import { formatNumber, formatPercent } from "./format";
import {
  reconciliar,
  type BajaArcaRow,
  type CpCampoRow,
  type LoteIngenioRow,
} from "./reconciliation";

export type Alert = {
  severity: "bad" | "warn" | "info";
  icon: string; // nombre de ícono Tabler, ej. "trending-down"
  message: string;
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
): { nombre: string; rows: InfrarutRow[] }[] {
  const { reconciliados, infrarutPorRemito } = reconciliar(cpsCampo, infraruts, bajas);
  const porLoteKey = new Map<string, InfrarutRow[]>();
  for (const x of reconciliados) {
    if (!x.lote) continue;
    const inf = infrarutPorRemito.get(x.cp);
    if (!inf) continue;
    if (!porLoteKey.has(x.lote)) porLoteKey.set(x.lote, []);
    porLoteKey.get(x.lote)!.push(inf);
  }
  const result: { nombre: string; rows: InfrarutRow[] }[] = [];
  for (const meta of lotesIngenio) {
    const rows = porLoteKey.get(meta.lote_key);
    if (rows && rows.length > 0) result.push({ nombre: meta.nombre, rows });
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

  for (const { nombre, rows } of lotes) {
    const fechasLote = [...new Set(rows.map((r) => r.fecha))].sort();
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
          icon: "trending-down",
          message: `${nombre}: caída de ${formatNumber(Math.abs(delta), 2)} pp de Rdto% vs día anterior (${formatPercent(prev.rdto)} → ${formatPercent(last.rdto)}, ${fmt(prevF)} → ${fmt(lastF)}). Verificar madurez del sector, regulación de cosechadora y lluvias previas.`,
        });
      }
    }

    // Rdto% bajo la meta (último día) — meta única (10,0%) para todos los lotes
    if (last.rdto < META) {
      alerts.push({
        severity: "bad",
        icon: "alert-circle",
        message: `${nombre} bajo la meta el ${fmt(lastF)}: ${formatPercent(last.rdto)} vs meta ${formatPercent(META, 1)}${prev ? ` (día anterior: ${formatPercent(prev.rdto)})` : ""}. Viajes más críticos: ${peoresRemitos(lastRows) || "—"}.`,
      });
    }

    // Pureza crítica (último día)
    if (last.pureza < UMBRALES.purezaCritica) {
      alerts.push({
        severity: "bad",
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
          icon: "droplet",
          message: `POL cayó ${formatNumber(Math.abs(deltaPol), 2)} pp en ${nombre} en un solo día (${formatPercent(prev.pol)} → ${formatPercent(last.pol)}). Posibles causas: lluvia reciente, sector menos maduro o caña más joven.`,
        });
      }
    }

    // Trash alto (último día)
    if (last.trash_pct > UMBRALES.trashAlerta) {
      alerts.push({
        severity: "warn",
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
          icon: "chart-line",
          message: `${nombre}: rendimiento estable (${formatPercent(ini)} → ${formatPercent(fin)} comparando primeros y últimos 3 días).`,
        });
      } else {
        alerts.push({
          severity: "info",
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

  const cpsCampoSet = new Set(cpsCampo.map((x) => x.cp));
  const sinLibreta = infraruts.filter(
    (r) => r.remito != null && !cpsCampoSet.has(r.remito),
  );
  if (sinLibreta.length > 0) {
    alerts.push({
      severity: "info",
      icon: "notebook",
      message: `${sinLibreta.length} viaje${sinLibreta.length !== 1 ? "s" : ""} del INFRARUT sin registro manual en la libreta. Falta transcribir esas páginas.`,
    });
  }

  const fechasIngenio = [...new Set(infraruts.map((r) => r.fecha))].sort();
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
