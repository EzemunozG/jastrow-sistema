"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  entradaStockSchema,
  type EntradaStockActionState,
} from "@/lib/forms/stock";

function emptyToUndefined(v: FormDataEntryValue | null) {
  const s = (v as string) ?? "";
  return s.trim() === "" ? undefined : s;
}

// index_10.html:3004-3022 (saveEntradaStock)
export async function addEntradaStock(
  _prevState: EntradaStockActionState,
  formData: FormData,
): Promise<EntradaStockActionState> {
  const parsed = entradaStockSchema.safeParse({
    nombre: formData.get("nombre"),
    categoria: formData.get("categoria"),
    unidad: formData.get("unidad"),
    cantidad: formData.get("cantidad"),
    precio: emptyToUndefined(formData.get("precio")),
    fecha: formData.get("fecha"),
    facturaId: emptyToUndefined(formData.get("facturaId")),
    obs: emptyToUndefined(formData.get("obs")),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const supabase = await createClient();

  // index_10.html:3015 — reusa el producto si ya existe (match case-insensitive).
  const { data: existing } = await supabase
    .from("productos")
    .select("id")
    .ilike("nombre", parsed.data.nombre)
    .maybeSingle();

  let productoId = existing?.id;
  if (!productoId) {
    productoId = `PROD-${Date.now()}`;
    const { error: prodError } = await supabase.from("productos").insert({
      id: productoId,
      nombre: parsed.data.nombre,
      categoria: parsed.data.categoria,
      unidad: parsed.data.unidad,
    });
    if (prodError) return { status: "error", error: prodError.message };
  }

  const { error } = await supabase.from("movimientos_stock").insert({
    producto_id: productoId,
    tipo: "entrada",
    fecha: parsed.data.fecha,
    cantidad: parsed.data.cantidad,
    precio_unit: parsed.data.precio ?? 0,
    origen: parsed.data.facturaId || "Entrada manual",
    obs: parsed.data.obs || null,
  });
  if (error) return { status: "error", error: error.message };

  revalidatePath("/stock/inventario");
  revalidatePath("/stock/recetas");
  return { status: "success" };
}
