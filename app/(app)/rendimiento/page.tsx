export const dynamic = "force-dynamic";

import { LoteTable } from "@/components/rendimiento/lote-table";
import { RendimientoSummary } from "@/components/rendimiento/rendimiento-summary";
import { INGENIOS, type IngenioId, type InfrarutRow } from "@/lib/business-rules";
import { rendimientoPorLote, totalizarRendimiento } from "@/lib/reconciliation";
import { createClient } from "@/lib/supabase/server";

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

export default async function RendimientoPage() {
  const supabase = await createClient();
  const [{ data: bajas }, ...porIngenio] = await Promise.all([
    supabase.from("bajas_arca").select("*").order("cp"),
    ...INGENIOS.map((i) => fetchIngenio(supabase, i.id)),
  ]);

  const rendimientoPorIngenio = INGENIOS.map((ingenio, idx) => ({
    ingenio,
    lotes: rendimientoPorLote(
      porIngenio[idx].cpsCampo,
      porIngenio[idx].infraruts,
      bajas ?? [],
      porIngenio[idx].lotesIngenio,
    ),
  }));

  const totalCombinado = totalizarRendimiento(
    rendimientoPorIngenio.flatMap((r) => r.lotes),
  );

  return (
    <div className="space-y-6">
      <RendimientoSummary
        title="Rendimiento total"
        sub="todos los lotes con datos · ambos ingenios"
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
    </div>
  );
}
