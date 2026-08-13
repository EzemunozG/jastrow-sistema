export const dynamic = "force-dynamic";

import { RealtimeRefresh } from "@/components/realtime-refresh";
import { LoteMapGrid } from "@/components/mapa/lote-map-grid";
import { computeAlerts, type Alert } from "@/lib/alerts";
import { INGENIOS, type InfrarutRow } from "@/lib/business-rules";
import {
  computeGeneralCampo,
  computeMapaLotes,
  RINDE_ESPERADO_DEFAULT,
  type MapaTrip,
} from "@/lib/lot-map";
import type {
  BajaArcaRow,
  CpCampoRow,
  LoteIngenioRow,
} from "@/lib/reconciliation";
import { createClient } from "@/lib/supabase/server";

export default async function MapaPage() {
  const supabase = await createClient();
  const [
    { data: lotesIngenio },
    { data: cpsCampo },
    { data: infraruts },
    { data: bajas },
    { data: recetaLotes },
    { data: recetaItems },
    { data: trabajos },
    { data: trabajoInsumos },
    { data: productos },
    { data: lotesFisicos },
    { data: appSettings },
  ] = await Promise.all([
    // select("*") en lotes_ingenio/app_settings a propósito: si la migración de
    // rinde_esperado_tn_ha (20260730000001) todavía no se aplicó, la columna no viene
    // y el fallback en código la cubre — pedirla explícita reventaría el select.
    supabase.from("lotes_ingenio").select("*"),
    supabase.from("cps_campo").select("*"),
    supabase.from("infraruts").select("*"),
    supabase.from("bajas_arca").select("*"),
    supabase.from("receta_lotes").select("receta_id, lote_id"),
    supabase
      .from("receta_items")
      .select("receta_id, producto_id, dosis, unidad, cantidad, total"),
    supabase.from("trabajos").select("id, lote_id, costo_labor, costo_total"),
    supabase
      .from("trabajo_insumos")
      .select("trabajo_id, descripcion, cantidad, unidad, total"),
    supabase.from("productos").select("id, nombre"),
    // `nombre` además de `ha`: un lote que todavía no está en lotes_ingenio (GELY)
    // saca de acá su nombre real para la tarjeta. Ver computeMapaLotes.
    supabase.from("lotes").select("id, ha, nombre"),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  // rdto se preserva nullable para el promedio del mapa (registros provisionales
  // pueden traerlo null → se promedia solo sobre presentes).
  const trips: MapaTrip[] = (infraruts ?? []).map((r) => ({
    remito: r.remito,
    ingenio_id: r.ingenio_id,
    kg_neto: r.kg_neto ?? 0,
    rdto: r.rdto,
  }));

  // Filas completas para computeAlerts (mismo mapeo que /alertas, para que los puntos
  // del mapa coincidan exactamente con lo que muestra esa pantalla).
  const infrarutRows: InfrarutRow[] = (infraruts ?? []).map((r) => ({
    cp: r.cp,
    ingenio_id: r.ingenio_id,
    remito: r.remito,
    fecha: r.fecha,
    finca_id: r.finca_id,
    veh: r.veh,
    maq: r.maq,
    kg_neto: r.kg_neto ?? 0,
    kg_trash: r.kg_trash ?? 0,
    kg_azucar: r.kg_azucar ?? 0,
    brix: r.brix ?? 0,
    pol: r.pol ?? 0,
    pureza: r.pureza ?? 0,
    rdto: r.rdto ?? 0,
  }));
  const cpsCampoRows: CpCampoRow[] = (cpsCampo ?? []).map((c) => ({
    cp: c.cp,
    ingenio_id: c.ingenio_id,
    fecha: c.fecha,
    camion: c.camion,
    obs: c.obs,
    lote: c.lote,
  }));
  const bajasRows: BajaArcaRow[] = (bajas ?? []).map((b) => ({
    cp: b.cp,
    gestionado: b.gestionado,
  }));
  const lotesIngenioRows: LoteIngenioRow[] = (lotesIngenio ?? []).map((l) => ({
    id: l.id,
    nombre: l.nombre,
    ingenio_id: l.ingenio_id,
    lote_key: l.lote_key,
    ha: l.ha,
    surcos_por_ha: l.surcos_por_ha,
  }));

  // Alertas UNA sola vez para todo el mapa (no por tarjeta). Con datos de ambos
  // ingenios juntos: las reglas por lote agrupan por lote_key (único entre ingenios),
  // así que salen bien; las reglas a nivel ingenio (sin lote_key) se descartan acá —
  // no pintan puntos en lotes.
  const alertasPorLote: Record<string, Alert[]> = {};
  for (const a of computeAlerts(cpsCampoRows, infrarutRows, bajasRows, lotesIngenioRows)) {
    if (!a.lote_key) continue;
    (alertasPorLote[a.lote_key] ??= []).push(a);
  }

  const cards = computeMapaLotes({
    lotesIngenio: (lotesIngenio ?? []).map((l) => ({
      lote_key: l.lote_key,
      nombre: l.nombre,
      ha: l.ha,
      surcos_por_ha: l.surcos_por_ha,
      rinde_esperado_tn_ha: l.rinde_esperado_tn_ha ?? null,
    })),
    cpsCampo: (cpsCampo ?? []).map((c) => ({ cp: c.cp, lote: c.lote })),
    trips,
    bajas: (bajas ?? []).map((b) => ({ cp: b.cp })),
    recetaLotes: recetaLotes ?? [],
    recetaItems: recetaItems ?? [],
    trabajos: trabajos ?? [],
    trabajoInsumos: trabajoInsumos ?? [],
    productos: productos ?? [],
    lotesFisicos: (lotesFisicos ?? []).map((l) => ({
      id: l.id,
      ha: l.ha ?? 0,
      nombre: l.nombre,
    })),
    tcBlue: appSettings?.tc_blue ?? 1495,
    rindeEsperadoDefault: appSettings?.rinde_esperado_tn_ha ?? RINDE_ESPERADO_DEFAULT,
    alertasPorLote,
    ingenioNombre: (id) => INGENIOS.find((i) => i.id === id)?.nombre ?? id,
  });

  return (
    <div className="space-y-5">
      <RealtimeRefresh tables={["infraruts", "cps_campo", "bajas_arca"]} />
      <div>
        <h1 className="text-lg font-semibold">Mapa de lotes</h1>
        <p className="text-sm text-muted-foreground">
          Un vistazo a toda la zafra: el número grande es el rinde en tn/ha, la barra el
          avance de cosecha, y el color va por Rdto% promedio vs la meta de 10%. El
          punto rojo o amarillo marca lotes con alertas. Los viajes anotados en la
          libreta que el ingenio todavía no pesó se cuentan aparte y no suman
          toneladas.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Todavía no hay lotes cargados en el sistema.
        </div>
      ) : (
        <LoteMapGrid cards={cards} general={computeGeneralCampo(cards)} />
      )}
    </div>
  );
}
