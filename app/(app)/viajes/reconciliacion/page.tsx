export const dynamic = "force-dynamic";

import { RealtimeRefresh } from "@/components/realtime-refresh";
import { BajasArcaCard } from "@/components/viajes/bajas-arca-card";
import { ReconciliacionTables } from "@/components/viajes/reconciliacion-tables";
import { RegistrarCpsForm } from "@/components/viajes/registrar-cps-form";
import { INGENIOS, type IngenioId, type InfrarutRow } from "@/lib/business-rules";
import { reconciliarPorLote } from "@/lib/reconciliation";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function fetchIngenio(supabase: Supabase, ingenioId: IngenioId) {
  const [{ data: cpsCampo }, { data: infrarutsData }] = await Promise.all([
    supabase.from("cps_campo").select("*").eq("ingenio_id", ingenioId).order("cp"),
    supabase.from("infraruts").select("*").eq("ingenio_id", ingenioId),
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

  return { cpsCampo: cpsCampo ?? [], infraruts };
}

export default async function ViajesReconciliacionPage() {
  const supabase = await createClient();
  // Las bajas ARCA no se separan por ingenio: son remitos del talonario del campo
  // (secuencia única, independiente de a qué ingenio se despachó).
  const [{ data: bajas }, ...porIngenio] = await Promise.all([
    supabase.from("bajas_arca").select("*").order("cp"),
    ...INGENIOS.map((i) => fetchIngenio(supabase, i.id)),
  ]);

  return (
    <div className="space-y-8">
      <RealtimeRefresh tables={["infraruts", "cps_campo", "bajas_arca"]} />
      <RegistrarCpsForm />
      {INGENIOS.map((ingenio, idx) => (
        <ReconciliacionTables
          key={ingenio.id}
          title={ingenio.nombre}
          cpsCampo={porIngenio[idx].cpsCampo}
          infraruts={porIngenio[idx].infraruts}
          bajas={bajas ?? []}
          porLote={reconciliarPorLote(
            porIngenio[idx].cpsCampo,
            porIngenio[idx].infraruts,
            bajas ?? [],
          )}
        />
      ))}
      <BajasArcaCard bajas={bajas ?? []} />
    </div>
  );
}
