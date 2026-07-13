export const dynamic = "force-dynamic";

import { LibretaImportForm } from "@/components/viajes/libreta-import-form";
import { LibretaTable } from "@/components/viajes/libreta-table";
import type { InfrarutRow } from "@/lib/business-rules";
import { createClient } from "@/lib/supabase/server";

export default async function ViajesLibretaPage() {
  const supabase = await createClient();
  const [{ data: cpsCampo }, { data: bajas }, { data: infrarutsData }] =
    await Promise.all([
      supabase.from("cps_campo").select("*").order("cp"),
      supabase.from("bajas_arca").select("*"),
      supabase.from("infraruts").select("*").eq("ingenio_id", "concepcion"),
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
      <LibretaImportForm />
      <LibretaTable
        cpsCampo={cpsCampo ?? []}
        bajas={bajas ?? []}
        infraruts={infraruts}
      />
    </div>
  );
}
