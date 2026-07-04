import { AlertasList } from "@/components/alertas/alertas-list";
import { computeAlerts } from "@/lib/alerts";
import type { InfrarutRow } from "@/lib/business-rules";
import { fechasUnicas } from "@/lib/business-rules";
import { createClient } from "@/lib/supabase/server";

export default async function AlertasPage() {
  const supabase = await createClient();
  const [{ data: infrarutsData }, { data: cpsCampo }, { data: bajas }] =
    await Promise.all([
      supabase.from("infraruts").select("*"),
      supabase.from("cps_campo").select("*"),
      supabase.from("bajas_arca").select("*"),
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

  const alerts = computeAlerts(infraruts, cpsCampo ?? [], bajas ?? []);
  const fechas = fechasUnicas(infraruts);

  return (
    <AlertasList
      alerts={alerts}
      desde={fechas[0] ?? null}
      hasta={fechas[fechas.length - 1] ?? null}
    />
  );
}
