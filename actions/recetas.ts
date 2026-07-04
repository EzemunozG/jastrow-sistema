"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recetaSchema, type RecetaActionState } from "@/lib/forms/recetas";

function emptyToUndefined(v: FormDataEntryValue | null) {
  const s = (v as string) ?? "";
  return s.trim() === "" ? undefined : s;
}

// Los ítems llegan como campos planos "items.0.producto_id", "items.0.dosis" (mismo
// truco que actions/facturas.ts y actions/trabajos.ts).
function parseItemsFromFormData(formData: FormData) {
  const rows: Record<number, Record<string, string>> = {};
  for (const [key, value] of formData.entries()) {
    const m = /^items\.(\d+)\.(producto_id|dosis)$/.exec(key);
    if (!m) continue;
    const idx = Number(m[1]);
    rows[idx] ??= {};
    rows[idx][m[2]] = value as string;
  }
  return Object.keys(rows)
    .map(Number)
    .sort((a, b) => a - b)
    .map((i) => rows[i]);
}

// index_10.html:3087-3110 (saveReceta) — guardado como transacción atómica vía RPC, ver
// supabase/migrations/20260704000000_receta_rpc.sql.
export async function saveReceta(
  _prevState: RecetaActionState,
  formData: FormData,
): Promise<RecetaActionState> {
  const parsed = recetaSchema.safeParse({
    fecha: formData.get("fecha"),
    loteId: formData.get("loteId"),
    ha: formData.get("ha"),
    tipo: formData.get("tipo"),
    empresa: emptyToUndefined(formData.get("empresa")),
    obs: emptyToUndefined(formData.get("obs")),
    items: parseItemsFromFormData(formData),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const supabase = await createClient();

  // El precio y la unidad de cada producto se toman del servidor (stock_saldo / productos),
  // nunca de lo que mandó el cliente — mismo criterio que el resto de las Server Actions.
  const productIds = [...new Set(parsed.data.items.map((it) => it.producto_id))];
  const [{ data: productos }, { data: saldos }] = await Promise.all([
    supabase.from("productos").select("id, unidad").in("id", productIds),
    supabase.from("stock_saldo").select("producto_id, precio_prom").in("producto_id", productIds),
  ]);
  const unidadMap = new Map((productos ?? []).map((p) => [p.id, p.unidad]));
  const precioMap = new Map((saldos ?? []).map((s) => [s.producto_id, s.precio_prom]));

  const items = parsed.data.items.map((it) => ({
    producto_id: it.producto_id,
    dosis: it.dosis,
    unidad: unidadMap.get(it.producto_id) ?? "",
    cantidad: it.dosis * parsed.data.ha,
    precio_unit: precioMap.get(it.producto_id) ?? 0,
  }));

  const id = `REC-${Date.now()}`;
  const nombre = `${parsed.data.tipo} — ${parsed.data.loteId} (${parsed.data.fecha})`;

  const { error } = await supabase.rpc("create_receta", {
    p_id: id,
    p_nombre: nombre,
    p_fecha: parsed.data.fecha,
    p_tipo: parsed.data.tipo,
    p_ha: parsed.data.ha,
    p_empresa: parsed.data.empresa ?? null,
    p_obs: parsed.data.obs ?? null,
    p_lote_ids: [parsed.data.loteId],
    p_items: items,
  });
  if (error) return { status: "error", error: error.message };

  revalidatePath("/stock/recetas");
  revalidatePath("/stock/inventario");
  return { status: "success" };
}
