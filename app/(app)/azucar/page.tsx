export const dynamic = "force-dynamic";

import { IconAlertTriangle } from "@tabler/icons-react";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { AzucarCard, AzucarTotal } from "@/components/azucar/azucar-cards";
import {
  NOTA_PROVISORIA,
  resumenAzucarIngenio,
  totalizarAzucar,
} from "@/lib/azucar";
import { INGENIOS, type InfrarutRow } from "@/lib/business-rules";
import { createClient } from "@/lib/supabase/server";

export default async function AzucarPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("infraruts")
    .select("ingenio_id, kg_neto, kg_azucar");

  // Solo hacen falta estos tres campos; el resto de InfrarutRow no interviene en el
  // cálculo de azúcar (ver lib/azucar.ts), así que se completa con ceros.
  const infraruts = (data ?? []).map(
    (r) =>
      ({
        cp: 0,
        ingenio_id: r.ingenio_id,
        remito: null,
        fecha: null,
        finca_id: null,
        veh: null,
        maq: null,
        kg_neto: r.kg_neto ?? 0,
        kg_trash: 0,
        kg_azucar: r.kg_azucar ?? 0,
        brix: 0,
        pol: 0,
        pureza: 0,
        rdto: 0,
      }) satisfies InfrarutRow,
  );

  const resumenes = INGENIOS.map((i) =>
    resumenAzucarIngenio(i.id, i.nombre, infraruts),
  );
  const total = totalizarAzucar(resumenes);

  return (
    <div className="space-y-5">
      <RealtimeRefresh tables={["infraruts"]} />

      <div>
        <h1 className="text-lg font-semibold">Azúcar por ingenio</h1>
        <p className="text-sm text-muted-foreground">
          Cuánta azúcar se produjo con la caña de Jastrow en cada ingenio y cuánta
          queda para Jastrow después del reparto. Se calcula sobre todos los viajes
          cargados del INFRARUT, estén o no transcriptos en la libreta — la libreta
          decide a qué lote se le atribuyen los kilos, no si el ingenio los recibió.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border-l-4 border-l-amber-600 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
        <IconAlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <strong>{NOTA_PROVISORIA}</strong> Los kilos de caña y de azúcar producida
          son datos medidos por el ingenio; el reparto que define la azúcar propia
          todavía no está confirmado y puede cambiar.
        </div>
      </div>

      {infraruts.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Todavía no hay viajes de INFRARUT cargados — importalos desde Resumen.
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {resumenes.map((r) => (
              <AzucarCard key={r.ingenio_id} resumen={r} />
            ))}
          </div>
          <AzucarTotal total={total} />
        </>
      )}
    </div>
  );
}
