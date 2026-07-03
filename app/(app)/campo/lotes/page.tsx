import { createClient } from "@/lib/supabase/server";
import { LotesTable } from "@/components/campo/lotes-table";

export default async function LotesPage() {
  const supabase = await createClient();
  const [
    { data: lotes },
    { data: fincas },
    { data: trabajos },
    { data: trabajoInsumos },
    { data: facturas },
  ] = await Promise.all([
    supabase.from("lotes").select("*").order("id"),
    supabase.from("fincas").select("*").order("nombre"),
    supabase.from("trabajos").select("*").order("fecha", { ascending: false }),
    supabase.from("trabajo_insumos").select("*"),
    supabase.from("facturas").select("*").order("fecha", { ascending: false }),
  ]);

  const insumosByTrabajo = new Map<string, typeof trabajoInsumos>();
  for (const it of trabajoInsumos ?? []) {
    const arr = insumosByTrabajo.get(it.trabajo_id) ?? [];
    arr.push(it);
    insumosByTrabajo.set(it.trabajo_id, arr);
  }
  const trabajosConInsumos = (trabajos ?? []).map((t) => ({
    ...t,
    insumos: insumosByTrabajo.get(t.id) ?? [],
  }));

  return (
    <LotesTable
      lotes={lotes ?? []}
      fincas={fincas ?? []}
      trabajos={trabajosConInsumos}
      facturas={facturas ?? []}
    />
  );
}
