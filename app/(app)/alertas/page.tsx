export const dynamic = "force-dynamic";

import { AlertasList } from "@/components/alertas/alertas-list";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import {
  computeAlertaBajas,
  computeAlerts,
  computeAlertasInfrarutFaltante,
} from "@/lib/alerts";
import { INGENIOS, fechasUnicas, type IngenioId, type InfrarutRow } from "@/lib/business-rules";
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

export default async function AlertasPage() {
  const supabase = await createClient();
  // Las bajas ARCA no se separan por ingenio (talonario único del campo, ver
  // computeAlertaBajas en lib/alerts.ts) — se calculan una sola vez, aparte.
  const [{ data: bajas }, ...porIngenio] = await Promise.all([
    supabase.from("bajas_arca").select("*"),
    ...INGENIOS.map((i) => fetchIngenio(supabase, i.id)),
  ]);

  const alertaBajas = computeAlertaBajas(bajas ?? []);

  // Los remitos son un talonario único del campo repartido entre los dos ingenios, así
  // que las brechas se buscan sobre los viajes de AMBOS juntos y recién después se
  // reparten por ingenio — ver computeAlertasInfrarutFaltante en lib/alerts.ts.
  const faltantes = computeAlertasInfrarutFaltante(
    porIngenio.flatMap((p) => p.infraruts),
  );

  return (
    <div className="space-y-6">
      <RealtimeRefresh tables={["infraruts", "cps_campo", "bajas_arca"]} />

      {alertaBajas && (
        <AlertasList alerts={[alertaBajas]} desde={null} hasta={null} />
      )}

      {INGENIOS.map((ingenio, idx) => {
        const { cpsCampo, infraruts, lotesIngenio } = porIngenio[idx];
        const fechas = fechasUnicas(infraruts);
        return (
          <div key={ingenio.id} className="space-y-3">
            <h2 className="text-base font-semibold">{ingenio.nombre}</h2>
            <AlertasList
              // Un INFRARUT faltante va primero: mientras no se cargue, todo lo que
              // sigue está calculado sobre datos incompletos.
              alerts={[
                ...faltantes.filter((a) => a.ingenio_id === ingenio.id),
                ...computeAlerts(cpsCampo, infraruts, bajas ?? [], lotesIngenio),
              ]}
              desde={fechas[0] ?? null}
              hasta={fechas[fechas.length - 1] ?? null}
            />
          </div>
        );
      })}
    </div>
  );
}
