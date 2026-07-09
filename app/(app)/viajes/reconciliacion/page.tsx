export const dynamic = "force-dynamic";

import { RealtimeRefresh } from "@/components/realtime-refresh";
import { BajasArcaCard } from "@/components/viajes/bajas-arca-card";
import { ReconciliacionTables } from "@/components/viajes/reconciliacion-tables";
import { RegistrarCpsForm } from "@/components/viajes/registrar-cps-form";
import type { InfrarutRow } from "@/lib/business-rules";
import { createClient } from "@/lib/supabase/server";

export default async function ViajesReconciliacionPage() {
  const supabase = await createClient();
  const [{ data: cpsCampo }, { data: bajas }, { data: infrarutsData }] =
    await Promise.all([
      supabase.from("cps_campo").select("*").order("cp"),
      supabase.from("bajas_arca").select("*").order("cp"),
      supabase.from("infraruts").select("*"),
    ]);

  const infraruts: InfrarutRow[] = (infrarutsData ?? []).map((r) => ({
    cp: r.cp,
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

  return (
    <div className="space-y-4">
      <RealtimeRefresh tables={["infraruts", "cps_campo", "bajas_arca"]} />
      <RegistrarCpsForm />
      <ReconciliacionTables
        cpsCampo={cpsCampo ?? []}
        infraruts={infraruts}
        bajas={bajas ?? []}
      />
      <BajasArcaCard bajas={bajas ?? []} />
    </div>
  );
}
