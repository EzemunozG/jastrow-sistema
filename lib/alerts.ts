// Reglas de alerta portadas literalmente de index_10.html:3113-3190 (renderAlertas).
// Mismos umbrales exactos — no ajustar sin confirmar con el usuario.
import {
  type InfrarutRow,
  META,
  UMBRALES,
  avg,
  fechasUnicas,
  porFincaFecha,
  statsFor,
} from "./business-rules";
import type { BajaArcaRow, CpCampoRow } from "./reconciliation";

export type Alert = {
  severity: "bad" | "warn" | "info";
  icon: string; // nombre de ícono Tabler, ej. "trending-down"
  message: string;
};

const FINCAS = [
  { id: "LOTE4", label: "Las 101" },
  { id: "VIRGINIA", label: "Tano" },
] as const;

function fmt(fecha: string | null): string {
  if (!fecha) return "—";
  return fecha.slice(5).split("-").reverse().join("/");
}

function peoresCps(infraruts: InfrarutRow[], fecha: string, fincaId: string) {
  return porFincaFecha(infraruts, fecha, fincaId)
    .sort((a, b) => a.rdto - b.rdto)
    .slice(0, 2)
    .map((r) => `CP${r.cp} (${r.rdto.toFixed(2)}%)`)
    .join(" y ");
}

export function computeAlerts(
  infraruts: InfrarutRow[],
  cpsCampo: CpCampoRow[],
  bajas: BajaArcaRow[],
  hoy: Date = new Date(),
): Alert[] {
  const fechas = fechasUnicas(infraruts);
  const alerts: Alert[] = [];
  if (fechas.length === 0) return alerts;

  const lastF = fechas[fechas.length - 1];
  const prevF = fechas.length > 1 ? fechas[fechas.length - 2] : null;

  const statsByFinca = Object.fromEntries(
    FINCAS.map((f) => [
      f.id,
      {
        last: statsFor(porFincaFecha(infraruts, lastF, f.id)),
        prev: prevF ? statsFor(porFincaFecha(infraruts, prevF, f.id)) : null,
      },
    ]),
  );

  // Caída de rendimiento vs día anterior (index_10.html:3124-3129)
  let algunaCae = false;
  for (const f of FINCAS) {
    const { last, prev } = statsByFinca[f.id];
    if (!last || !prev) continue;
    const delta = last.rdto - prev.rdto;
    if (delta < -0.3) {
      algunaCae = true;
      alerts.push({
        severity: "bad",
        icon: "trending-down",
        message: `${f.label}: caída de ${Math.abs(delta).toFixed(2)} pp de Rdto% vs día anterior (${prev.rdto.toFixed(2)}% → ${last.rdto.toFixed(2)}%, ${fmt(prevF)} → ${fmt(lastF)}). Verificar madurez del sector, regulación de cosechadora y lluvias previas.`,
      });
    }
  }
  if (algunaCae) {
    alerts.push({
      severity: "info",
      icon: "trending-down",
      message:
        "Ambas fincas cayeron el mismo día — puede apuntar a un factor externo común: lluvia, cambio de sector o condición del ingenio.",
    });
  }

  // Bajo la meta (index_10.html:3136-3137)
  for (const f of FINCAS) {
    const { last, prev } = statsByFinca[f.id];
    if (!last || last.rdto >= META) continue;
    const severity = f.id === "LOTE4" ? "bad" : "warn";
    alerts.push({
      severity,
      icon: "alert-circle",
      message: `${f.label} bajo la meta el ${fmt(lastF)}: ${last.rdto.toFixed(2)}% vs meta ${META.toFixed(1)}%${prev ? ` (día anterior: ${prev.rdto.toFixed(2)}%)` : ""}. Viajes más críticos: ${peoresCps(infraruts, lastF, f.id) || "—"}.`,
    });
  }

  // Pureza crítica (index_10.html:3140-3141)
  for (const f of FINCAS) {
    const { last } = statsByFinca[f.id];
    if (last && last.pureza < UMBRALES.purezaCritica) {
      alerts.push({
        severity: "bad",
        icon: "droplet-off",
        message: `Pureza crítica en ${f.label}: ${last.pureza.toFixed(2)}% promedio (mín. recomendado: ${UMBRALES.purezaWarn}%). Indica azúcares reductores, material vegetal o caña deteriorada.`,
      });
    }
  }

  // Caída de POL en un día (index_10.html:3144-3145)
  for (const f of FINCAS) {
    const { last, prev } = statsByFinca[f.id];
    if (!last || !prev) continue;
    const delta = last.pol - prev.pol;
    if (delta < -0.5) {
      alerts.push({
        severity: "warn",
        icon: "droplet",
        message: `POL cayó ${Math.abs(delta).toFixed(2)} pp en ${f.label} en un solo día (${prev.pol.toFixed(2)}% → ${last.pol.toFixed(2)}%). Posibles causas: lluvia reciente, sector menos maduro o caña más joven.`,
      });
    }
  }

  // Trash alto (index_10.html:3148-3149)
  for (const f of FINCAS) {
    const { last } = statsByFinca[f.id];
    if (last && last.trash_pct > UMBRALES.trashAlerta) {
      alerts.push({
        severity: "warn",
        icon: "leaf",
        message: `Trash alto en ${f.label}: ${last.trash_pct.toFixed(2)}% el ${fmt(lastF)}. Revisar regulación de extractores de la cosechadora.`,
      });
    }
  }

  // Reconciliación pendiente (index_10.html:3152-3162)
  const enInfrarut = new Set(
    infraruts.filter((r) => r.remito != null).map((r) => r.remito as number),
  );
  const bajasSet = new Set(bajas.map((b) => b.cp));
  const pendientes = cpsCampo.filter(
    (x) => !enInfrarut.has(x.cp) && !bajasSet.has(x.cp),
  );
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
  const bajasPendientes = bajas.filter((b) => !b.gestionado);
  if (bajasPendientes.length > 0) {
    alerts.push({
      severity: "bad",
      icon: "file-x",
      message: `${bajasPendientes.length} baja${bajasPendientes.length !== 1 ? "s" : ""} ARCA pendiente${bajasPendientes.length !== 1 ? "s" : ""} de gestión: ${bajasPendientes.map((b) => "remito " + b.cp).join(", ")}. Recordá dar de baja estas cartas de porte.`,
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

  // Tendencia primeros 3 días vs últimos 3 días con datos (index_10.html:3165-3175)
  for (const f of FINCAS) {
    const dias = fechas
      .map((fecha) => statsFor(porFincaFecha(infraruts, fecha, f.id)))
      .filter((s): s is NonNullable<typeof s> => s !== null);
    if (dias.length < 4) continue;
    const ini = avg(dias.slice(0, 3), (x) => x.rdto);
    const fin = avg(dias.slice(-3), (x) => x.rdto);
    const delta = fin - ini;
    if (Math.abs(delta) < 0.15) {
      alerts.push({
        severity: "info",
        icon: "chart-line",
        message: `${f.label}: rendimiento estable (${ini.toFixed(2)}% → ${fin.toFixed(2)}% comparando primeros y últimos 3 días).`,
      });
    } else {
      alerts.push({
        severity: "info",
        icon: "chart-line",
        message: `${f.label}: tendencia ${delta > 0 ? "positiva ▲" : "negativa ▼"} de ${delta > 0 ? "+" : ""}${delta.toFixed(2)} pp (${ini.toFixed(2)}% → ${fin.toFixed(2)}%).`,
      });
    }
  }

  // Antigüedad de datos (index_10.html:3178-3181)
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
