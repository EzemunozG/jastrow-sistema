export const dynamic = "force-dynamic";

import { RealtimeRefresh } from "@/components/realtime-refresh";
import { LoteMapGrid } from "@/components/mapa/lote-map-grid";
import { INGENIOS } from "@/lib/business-rules";
import { computeMapaLotes, type MapaTrip } from "@/lib/lot-map";
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
    supabase.from("lotes_ingenio").select("lote_key, nombre, ha, surcos_por_ha"),
    supabase.from("cps_campo").select("cp, lote"),
    // rdto se preserva nullable a propósito (registros provisionales pueden traerlo
    // null) — el cálculo promedia solo sobre valores presentes. Ver lib/lot-map.ts.
    supabase.from("infraruts").select("remito, ingenio_id, kg_neto, rdto"),
    supabase.from("bajas_arca").select("cp"),
    supabase.from("receta_lotes").select("receta_id, lote_id"),
    supabase
      .from("receta_items")
      .select("receta_id, producto_id, dosis, unidad, cantidad, total"),
    supabase.from("trabajos").select("id, lote_id, costo_labor, costo_total"),
    supabase
      .from("trabajo_insumos")
      .select("trabajo_id, descripcion, cantidad, unidad, total"),
    supabase.from("productos").select("id, nombre"),
    supabase.from("lotes").select("id, ha"), // ha del lote físico, para prorratear
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const trips: MapaTrip[] = (infraruts ?? []).map((r) => ({
    remito: r.remito,
    ingenio_id: r.ingenio_id,
    kg_neto: r.kg_neto ?? 0,
    rdto: r.rdto,
  }));

  const cards = computeMapaLotes({
    lotesIngenio: lotesIngenio ?? [],
    cpsCampo: cpsCampo ?? [],
    trips,
    bajas: bajas ?? [],
    recetaLotes: recetaLotes ?? [],
    recetaItems: recetaItems ?? [],
    trabajos: trabajos ?? [],
    trabajoInsumos: trabajoInsumos ?? [],
    productos: productos ?? [],
    lotesFisicos: (lotesFisicos ?? []).map((l) => ({ id: l.id, ha: l.ha ?? 0 })),
    tcBlue: appSettings?.tc_blue ?? 1495,
    ingenioNombre: (id) => INGENIOS.find((i) => i.id === id)?.nombre ?? id,
  });

  return (
    <div className="space-y-5">
      <RealtimeRefresh tables={["infraruts", "cps_campo", "bajas_arca"]} />
      <div>
        <h1 className="text-lg font-semibold">Mapa de lotes</h1>
        <p className="text-sm text-neutral-500">
          Un vistazo a toda la zafra: el número grande es tn/surco (parcial mientras la
          cosecha está en curso); el color va por Rdto% promedio vs la meta de 10%.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-neutral-500">
          Todavía no hay lotes cargados en el sistema.
        </div>
      ) : (
        <LoteMapGrid cards={cards} />
      )}
    </div>
  );
}
