export const dynamic = "force-dynamic";

import { RealtimeRefresh } from "@/components/realtime-refresh";
import { ViajesTable } from "@/components/viajes/viajes-table";
import { FilterBar, type LoteOption } from "@/components/filters/filter-bar";
import type { InfrarutRow } from "@/lib/business-rules";
import {
  countFiltrosActivos,
  enRangoFecha,
  parseFiltros,
  type SearchParamsInput,
} from "@/lib/filters";
import { createClient } from "@/lib/supabase/server";

export default async function ViajesListadoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const filtros = parseFiltros(await searchParams);
  const supabase = await createClient();

  let infrarutsQuery = supabase.from("infraruts").select("*").order("cp");
  if (filtros.ingenio !== "all") {
    infrarutsQuery = infrarutsQuery.eq("ingenio_id", filtros.ingenio);
  }

  const [{ data: infrarutsData }, { data: cpsCampo }, { data: bajas }, { data: lotesIngenio }] =
    await Promise.all([
      infrarutsQuery,
      // cps_campo no se filtra por ingenio: el remito es el talonario propio del
      // campo (una sola secuencia), y acá hace falta para "en libreta" + el lote de
      // origen de cada despacho — ver lib/reconciliation.ts.
      supabase.from("cps_campo").select("cp, lote"),
      supabase.from("bajas_arca").select("cp"),
      supabase.from("lotes_ingenio").select("*"),
    ]);

  const remitoLote = new Map((cpsCampo ?? []).map((r) => [r.cp, r.lote]));

  let infraruts: InfrarutRow[] = (infrarutsData ?? []).map((r) => ({
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

  infraruts = infraruts.filter((r) => enRangoFecha(r.fecha, filtros.desde, filtros.hasta));
  if (filtros.lote) {
    infraruts = infraruts.filter(
      (r) => r.remito != null && remitoLote.get(r.remito) === filtros.lote,
    );
  }
  if (filtros.busca) {
    infraruts = infraruts.filter((r) => String(r.remito ?? "").includes(filtros.busca));
  }

  const lotesOptions: LoteOption[] = (lotesIngenio ?? [])
    .filter((l) => filtros.ingenio === "all" || l.ingenio_id === filtros.ingenio)
    .map((l) => ({ value: l.lote_key, label: l.nombre, ingenioId: l.ingenio_id }));

  return (
    <div className="space-y-4">
      <RealtimeRefresh tables={["infraruts", "cps_campo", "bajas_arca"]} />
      <FilterBar filtros={filtros} lotes={lotesOptions} showBusca />
      <ViajesTable
        infraruts={infraruts}
        cpsCampo={(cpsCampo ?? []).map((r) => r.cp)}
        bajas={(bajas ?? []).map((r) => r.cp)}
        filtrosActivos={countFiltrosActivos(filtros) > 0}
      />
    </div>
  );
}
