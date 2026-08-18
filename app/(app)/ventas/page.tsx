export const dynamic = "force-dynamic";

import { VentasTable } from "@/components/azucar/ventas-table";
import { INGENIOS } from "@/lib/business-rules";
import { NOTA_DISPONIBLE, type VentaAzucarRow } from "@/lib/ventas-azucar";
import { createClient } from "@/lib/supabase/server";

export default async function VentasPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ventas_azucar")
    .select("*")
    .order("fecha", { ascending: false });

  const ventas: VentaAzucarRow[] = data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Ventas de azúcar</h1>
        <p className="text-sm text-muted-foreground">
          Las operaciones de venta de la azúcar propia. Sus kilos se descuentan del
          disponible que muestra Azúcar por ingenio. Por ahora es solo lectura: la
          carga se hace desde la base.
        </p>
      </div>

      <VentasTable
        ventas={ventas}
        ingenioNombre={(id) => INGENIOS.find((i) => i.id === id)?.nombre ?? id}
      />

      <p className="text-xs text-muted-foreground">{NOTA_DISPONIBLE}</p>
    </div>
  );
}
