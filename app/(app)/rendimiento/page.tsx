export const dynamic = "force-dynamic";

import { FilterBar, type LoteOption } from "@/components/filters/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { LoteTable } from "@/components/rendimiento/lote-table";
import { RendimientoSummary } from "@/components/rendimiento/rendimiento-summary";
import { INGENIOS, type IngenioId, type InfrarutRow } from "@/lib/business-rules";
import { enRangoFecha, parseFiltros, type SearchParamsInput } from "@/lib/filters";
import { rendimientoPorLote, totalizarRendimiento } from "@/lib/reconciliation";
import { createClient } from "@/lib/supabase/server";
import { Sprout } from "lucide-react";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Mismo cruce que /viajes/reconciliacion: cps_campo (libreta) contra infraruts (datos
// del ingenio) por remito, ambos ya filtrados al mismo ingenio_id — y lotes_ingenio
// por lote_key para el hectareaje. Ver lib/reconciliation.ts (rendimientoPorLote).
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

export default async function RendimientoPage({
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

  const rendimientoPorIngenio = ingeniosEnAlcance.map((ingenio, idx) => {
    const infrarutsEnRango = porIngenio[idx].infraruts.filter((r) =>
      enRangoFecha(r.fecha, filtros.desde, filtros.hasta),
    );
    let lotes = rendimientoPorLote(
      porIngenio[idx].cpsCampo,
      infrarutsEnRango,
      bajas ?? [],
      porIngenio[idx].lotesIngenio,
    );
    if (filtros.lote) lotes = lotes.filter((l) => l.lote_key === filtros.lote);
    return { ingenio, lotes };
  });

  const totalCombinado = totalizarRendimiento(
    rendimientoPorIngenio.flatMap((r) => r.lotes),
  );
  const sinResultados = rendimientoPorIngenio.every((r) => r.lotes.length === 0);

  return (
    <div className="space-y-6">
      <FilterBar filtros={filtros} lotes={lotesOptions} />

      {sinResultados ? (
        <EmptyState
          icon={Sprout}
          title="No hay lotes que coincidan con estos filtros"
          description="Probá ampliar el rango de fechas o cambiar el ingenio/lote seleccionado."
        />
      ) : (
        <>
          <RendimientoSummary
            title="Rendimiento total"
            sub={
              filtros.ingenio === "all"
                ? "todos los lotes con datos · ambos ingenios"
                : `todos los lotes con datos · ${ingeniosEnAlcance[0].nombre}`
            }
            total={totalCombinado}
          />

          {rendimientoPorIngenio.map(({ ingenio, lotes }) => (
            <div key={ingenio.id} className="space-y-3">
              <h2 className="text-base font-semibold">{ingenio.nombre}</h2>
              <RendimientoSummary
                title="Subtotal"
                sub="lotes con datos de este ingenio"
                total={totalizarRendimiento(lotes)}
              />
              <div className="rounded-xl border bg-white p-4">
                <LoteTable lotes={lotes} />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
