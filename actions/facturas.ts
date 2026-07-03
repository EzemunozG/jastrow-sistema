"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const FACTURA_TIPOS = [
  "Factura A",
  "Factura B",
  "Factura C",
  "Ticket",
  "Remito",
  "Presupuesto",
  "Otro",
] as const;

export const FACTURA_CATEGORIAS = [
  "Agroquímicos",
  "Fertilizantes",
  "Semillas / Plantines",
  "Combustible",
  "Maquinaria / Servicios",
  "Mano de obra",
  "Arriendo",
  "Otros insumos",
  "Otro",
] as const;

export const facturaItemSchema = z.object({
  descripcion: z.string().min(1, "Descripción del ítem requerida"),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  unidad: z.string().min(1, "Unidad requerida"),
  precio_unit: z.coerce.number().nonnegative("El precio no puede ser negativo"),
});

const facturaSchema = z.object({
  idOriginal: z.string().optional(),
  numero: z.string().min(1, "N° de comprobante obligatorio"),
  tipo: z.enum(FACTURA_TIPOS),
  proveedor: z.string().min(1, "Proveedor obligatorio"),
  cuit: z.string().optional(),
  fecha: z.string().min(1, "Fecha obligatoria"),
  categoria: z.enum(FACTURA_CATEGORIAS),
  obs: z.string().optional(),
  existingImgPath: z.string().optional(),
  items: z
    .array(facturaItemSchema)
    .min(1, "Agregá al menos un ítem a la factura"),
});

export type FacturaItemValues = z.input<typeof facturaItemSchema>;
export type FacturaFormValues = z.input<typeof facturaSchema>;

export type FacturaActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export const FACTURA_ACTION_IDLE: FacturaActionState = { status: "idle" };

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
