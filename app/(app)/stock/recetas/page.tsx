import { RecetasView } from "@/components/stock/recetas-view";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

type RecetaItem = Database["public"]["Tables"]["receta_items"]["Row"];

export default async function RecetasPage() {
  const supabase = await createClient();
  const [
    { data: recetas },
    { data: items },
    { data: recetaLotes },
    { data: lotes },
    { data: productos },
    { data: saldos },
  ] = await Promise.all([
    supabase.from("recetas").select("*").order("fecha", { ascending: false }),
    supabase.from("receta_items").select("*"),
    supabase.from("receta_lotes").select("*"),
    supabase.from("lotes").select("*").order("id"),
    supabase.from("productos").select("*").order("nombre"),
    supabase.from("stock_saldo").select("*"),
  ]);

  const itemsByReceta = new Map<string, RecetaItem[]>();
  for (const it of items ?? []) {
    const arr = itemsByReceta.get(it.receta_id) ?? [];
    arr.push(it);
    itemsByReceta.set(it.receta_id, arr);
  }

  const lotesByReceta = new Map<string, string[]>();
  for (const rl of recetaLotes ?? []) {
    const arr = lotesByReceta.get(rl.receta_id) ?? [];
    arr.push(rl.lote_id);
    lotesByReceta.set(rl.receta_id, arr);
  }

  const precioProm = new Map(
    (saldos ?? []).map((s) => [s.producto_id, s.precio_prom]),
  );

  return (
    <RecetasView
      recetas={recetas ?? []}
      itemsByReceta={itemsByReceta}
      lotesByReceta={lotesByReceta}
      lotes={lotes ?? []}
      productos={productos ?? []}
      precioProm={precioProm}
    />
  );
}
