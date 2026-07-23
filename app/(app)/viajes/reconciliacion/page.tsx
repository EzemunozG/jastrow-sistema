export const dynamic = "force-dynamic";

import { RealtimeRefresh } from "@/components/realtime-refresh";
import { BajasArcaCard } from "@/components/viajes/bajas-arca-card";
import { ReconciliacionTables } from "@/components/viajes/reconciliacion-tables";
import { RegistrarCpsForm } from "@/components/viajes/registrar-cps-form";
import { FilterBar, type LoteOption } from "@/components/filters/filter-bar";
import { INGENIOS, type IngenioId, type InfrarutRow } from "@/lib/business-rules";
import { enRangoFecha, parseFiltros, type SearchParamsInput } from "@/lib/filters";
import { reconciliarPorLote, rendimientoPorLote } from "@/lib/reconciliation";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function fetchIngenio(supabase: Supabase, ingenioId: IngenioId) {
  const [{ data: cpsCampo }, { data: infrarutsData }, { data: lotesIngenio }] =
    await Promise.all([
      supabase.from("cps_campo").select("*").eq("ingenio_id", ingenioId).order("cp"),
      supabase.from("infraruts").select("*").eq("ingenio_id", ingenioId),
      supabase.from("lotes_ingenio").select("*").eq("ingenio_id", ingenioId),
    ]);

  const infraruts: InfrarutRow[] = (infrarutsData ?? []).map((r) => ({
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

  return { cpsCampo: cpsCampo ?? [], infraruts, lotesIngenio: lotesIngenio ?? [] };
}

export default async function ViajesReconciliacionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const filtros = parseFiltros(await searchParams);
  const ingeniosEnAlcance =
    filtros.ingenio === "all"
      ? INGENIOS
      : INGENIOS.filter((i) => i.id === filtros.ingenio);

  const supabase = await createClient();
  // Las bajas ARCA no se separan por ingenio: son remitos del talonario del campo
  // (secuencia única, independiente de a qué ingenio se despachó).
  const [{ data: bajas }, ...porIngenio] = await Promise.all([
    supabase.from("bajas_arca").select("*").order("cp"),
    ...ingeniosEnAlcance.map((i) => fetchIngenio(supabase, i.id)),
  ]);

  const lotesOptions: LoteOption[] = porIngenio.flatMap((d) =>
    d.lotesIngenio.map((l) => ({
      value: l.lote_key,
      label: l.nombre,
      ingenioId: l.ingenio_id,
    })),
  );

  return (
    <div className="space-y-8">
      <RealtimeRefresh tables={["infraruts", "cps_campo", "bajas_arca"]} />
      <FilterBar filtros={filtros} lotes={lotesOptions} />
      <RegistrarCpsForm />
      {ingeniosEnAlcance.map((ingenio, idx) => {
        // El rango de fechas se aplica solo sobre infraruts (fecha reportada por el
        // ingenio) — cps_campo queda completo para no marcar como "pendiente" un
        // remito que en realidad ya está reconciliado, solo que su INFRARUT cayó
        // fuera del rango elegido. El filtro de lote sí recorta cps_campo: un viaje
        // de otro lote no debería contar ni como reconciliado ni como reclamo acá.
        const infrarutsFiltrados = porIngenio[idx].infraruts.filter((r) =>
          enRangoFecha(r.fecha, filtros.desde, filtros.hasta),
        );
        const cpsCampoFiltrado = filtros.lote
          ? porIngenio[idx].cpsCampo.filter((x) => x.lote === filtros.lote)
          : porIngenio[idx].cpsCampo;

        return (
          <ReconciliacionTables
            key={ingenio.id}
            title={ingenio.nombre}
            cpsCampo={cpsCampoFiltrado}
            cpsCampoCompleto={porIngenio[idx].cpsCampo}
            infraruts={infrarutsFiltrados}
            bajas={bajas ?? []}
            porLote={reconciliarPorLote(cpsCampoFiltrado, infrarutsFiltrados, bajas ?? [])}
            rendimientoPorLote={rendimientoPorLote(
              cpsCampoFiltrado,
              infrarutsFiltrados,
              bajas ?? [],
              porIngenio[idx].lotesIngenio,
            )}
          />
        );
      })}
      <BajasArcaCard bajas={bajas ?? []} />
    </div>
  );
}
