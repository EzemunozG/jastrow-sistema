import { ViajesTable } from "@/components/viajes/viajes-table";
import type { InfrarutRow } from "@/lib/business-rules";
import { createClient } from "@/lib/supabase/server";

export default async function ViajesListadoPage() {
  const supabase = await createClient();
  const [{ data: infrarutsData }, { data: cpsCampo }, { data: bajas }] =
    await Promise.all([
      supabase.from("infraruts").select("*").order("cp"),
      supabase.from("cps_campo").select("cp"),
      supabase.from("bajas_arca").select("cp"),
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

  if (infraruts.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-6 text-sm text-neutral-500">
        Todavía no hay viajes de INFRARUT cargados — importalos desde Resumen.
      </div>
    );
  }

  return (
    <ViajesTable
      infraruts={infraruts}
      cpsCampo={(cpsCampo ?? []).map((r) => r.cp)}
      bajas={(bajas ?? []).map((r) => r.cp)}
    />
  );
}
