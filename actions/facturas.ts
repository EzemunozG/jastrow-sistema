"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  facturaSchema,
  type FacturaActionState,
} from "@/lib/forms/facturas";

function emptyToUndefined(v: FormDataEntryValue | null) {
  const s = (v as string) ?? "";
  return s.trim() === "" ? undefined : s;
}

// Los ítems llegan como campos planos "items.0.descripcion", "items.1.cantidad", etc.
// (nombres generados por react-hook-form's useFieldArray sobre inputs nativos), así que
// hay que reconstruir el array a partir de las claves de FormData.
function parseItemsFromFormData(formData: FormData) {
  const rows: Record<number, Record<string, string>> = {};
  for (const [key, value] of formData.entries()) {
    const m = /^items\.(\d+)\.(descripcion|cantidad|unidad|precio_unit)$/.exec(
      key,
    );
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

function parseFacturaForm(formData: FormData) {
  return facturaSchema.safeParse({
    idOriginal: emptyToUndefined(formData.get("idOriginal")),
    numero: formData.get("numero"),
    tipo: formData.get("tipo"),
    proveedor: formData.get("proveedor"),
    cuit: emptyToUndefined(formData.get("cuit")),
    fecha: formData.get("fecha"),
    categoria: formData.get("categoria"),
    obs: emptyToUndefined(formData.get("obs")),
    existingImgPath: emptyToUndefined(formData.get("existingImgPath")),
    items: parseItemsFromFormData(formData),
  });
}

export async function saveFactura(
  _prevState: FacturaActionState,
  formData: FormData,
): Promise<FacturaActionState> {
  const parsed = parseFacturaForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { idOriginal, existingImgPath, items, ...rest } = parsed.data;
  const id = idOriginal || `F${Date.now()}`;
  const total = items.reduce(
    (s, it) => s + it.cantidad * it.precio_unit,
    0,
  );

  const supabase = await createClient();

  let img_path = existingImgPath ?? null;
  const file = formData.get("img_file");
  if (file instanceof File && file.size > 0) {
    const path = `${id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("facturas-imgs")
      .upload(path, file, { upsert: true });
    if (uploadError) return { status: "error", error: uploadError.message };
    img_path = path;
  }

  const { error: facturaError } = await supabase.from("facturas").upsert({
    id,
    ...rest,
    total,
    total_moneda: "ARS",
    img_path,
  });
  if (facturaError) return { status: "error", error: facturaError.message };

  // Reemplazo completo de ítems: más simple y menos propenso a errores que diffear
  // insert/update/delete fila por fila para un form que siempre reenvía la lista entera.
  const { error: deleteError } = await supabase
    .from("factura_items")
    .delete()
    .eq("factura_id", id);
  if (deleteError) return { status: "error", error: deleteError.message };

  const { error: itemsError } = await supabase.from("factura_items").insert(
    items.map((it) => ({
      factura_id: id,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      unidad: it.unidad,
      precio_unit: it.precio_unit,
    })),
  );
  if (itemsError) return { status: "error", error: itemsError.message };

  revalidatePath("/campo/facturas");
  return { status: "success" };
}

export async function deleteFactura(id: string, imgPath: string | null) {
  const supabase = await createClient();
  if (imgPath) {
    await supabase.storage.from("facturas-imgs").remove([imgPath]);
  }
  await supabase.from("facturas").delete().eq("id", id);
  revalidatePath("/campo/facturas");
}
