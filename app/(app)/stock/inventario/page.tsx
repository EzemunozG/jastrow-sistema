import { InventarioView } from "@/components/stock/inventario-view";
import { createClient } from "@/lib/supabase/server";

export default async function InventarioPage() {
  const supabase = await createClient();
  const [{ data: productos }, { data: movimientos }, { data: facturas }] =
    await Promise.all([
      supabase.from("productos").select("*").order("nombre"),
      supabase.from("movimientos_stock").select("*"),
      supabase.from("facturas").select("*").order("fecha", { ascending: false }),
    ]);

  return (
    <InventarioView
      productos={productos ?? []}
      movimientos={movimientos ?? []}
      facturas={facturas ?? []}
    />
  );
}
