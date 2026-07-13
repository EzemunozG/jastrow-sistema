export const dynamic = "force-dynamic";

import { RealtimeRefresh } from "@/components/realtime-refresh";
import { BajasArcaCard } from "@/components/viajes/bajas-arca-card";
import { IngenioToggle } from "@/components/viajes/ingenio-toggle";
import { ReconciliacionTables } from "@/components/viajes/reconciliacion-tables";
import { RegistrarCpsForm } from "@/components/viajes/registrar-cps-form";
import type { IngenioId, InfrarutRow } from "@/lib/business-rules";
import { createClient } from "@/lib/supabase/server";

export default async function ViajesReconciliacionPage({
  searchParams,
}: {
  searchParams: Promise<{ ingenio?: string }>;
}) {
  const { ingenio } = await searchParams;
  const ingenioId: IngenioId = ingenio === "trinidad" ? "trinidad" : "concepcion";

  const supabase = await createClient();
  const [{ data: cpsCampo }, { data: bajas }, { data: infrarutsData }] =
    await Promise.all([
      supabase.from("cps_campo").select("*").order("cp"),
      supabase.from("bajas_arca").select("*").order("cp"),
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

  return (
    <div className="space-y-4">
      <RealtimeRefresh tables={["infraruts", "cps_campo", "bajas_arca"]} />
      <IngenioToggle active={ingenioId} basePath="/viajes/reconciliacion" />
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
