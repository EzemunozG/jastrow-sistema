"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { trabajoSchema, type TrabajoActionState } from "@/lib/forms/trabajos";

function emptyToUndefined(v: FormDataEntryValue | null) {
  const s = (v as string) ?? "";
  return s.trim() === "" ? undefined : s;
}

// Mismo truco que en actions/facturas.ts: los insumos llegan como campos planos
// "insumos.0.descripcion", "insumos.1.cantidad", etc. (useFieldArray de
// react-hook-form sobre inputs nativos), hay que reconstruir el array.
function parseInsumosFromFormData(formData: FormData) {
  const rows: Record<number, Record<string, string>> = {};
  for (const [key, value] of formData.entries()) {
    const m =
      /^insumos\.(\d+)\.(descripcion|cantidad|unidad|precio_unit|factura_id)$/.exec(
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

export async function saveTrabajo(
  _prevState: TrabajoActionState,
  formData: FormData,
): Promise<TrabajoActionState> {
  const parsed = trabajoSchema.safeParse({
    lote_id: formData.get("lote_id"),
    fecha: formData.get("fecha"),
    tipo: formData.get("tipo"),
    ha: emptyToUndefined(formData.get("ha")),
    empresa: emptyToUndefined(formData.get("empresa")),
    costo_labor: emptyToUndefined(formData.get("costo_labor")),
    obs: emptyToUndefined(formData.get("obs")),
    insumos: parseInsumosFromFormData(formData),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { lote_id, fecha, tipo, ha, empresa, costo_labor, obs, insumos } =
    parsed.data;
  const costoInsumos = insumos.reduce(
    (s, it) => s + it.cantidad * it.precio_unit,
    0,
  );

  const supabase = await createClient();

  const { data: trabajo, error: trabajoError } = await supabase
    .from("trabajos")
    .insert({
      lote_id,
      fecha,
      tipo,
      ha: ha ? Number(ha) : null,
      empresa: empresa ?? null,
      obs: obs ?? null,
      costo_labor: costo_labor ? Number(costo_labor) : 0,
      costo_insumos: costoInsumos,
    })
    .select("id")
    .single();
  if (trabajoError) return { status: "error", error: trabajoError.message };

  if (insumos.length > 0) {
    const { error: insumosError } = await supabase
      .from("trabajo_insumos")
      .insert(
        insumos.map((it) => ({
          trabajo_id: trabajo.id,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          unidad: it.unidad,
          precio_unit: it.precio_unit,
          factura_id: it.factura_id || null,
        })),
      );
    if (insumosError) return { status: "error", error: insumosError.message };
  }

  revalidatePath("/campo/lotes");
  revalidatePath("/campo/costos");
  return { status: "success" };
}

export async function deleteTrabajo(id: string) {
  const supabase = await createClient();
  await supabase.from("trabajos").delete().eq("id", id);
  revalidatePath("/campo/lotes");
  revalidatePath("/campo/costos");
}
