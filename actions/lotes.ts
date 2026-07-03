"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loteSchema, type LoteActionState } from "@/lib/forms/lotes";

function emptyToUndefined(v: FormDataEntryValue | null) {
  const s = (v as string) ?? "";
  return s.trim() === "" ? undefined : s;
}

function parseLoteForm(formData: FormData) {
  return loteSchema.safeParse({
    id: formData.get("id"),
    idOriginal: emptyToUndefined(formData.get("idOriginal")),
    nombre: emptyToUndefined(formData.get("nombre")),
    ha: formData.get("ha"),
    tipo: formData.get("tipo"),
    finca_id: emptyToUndefined(formData.get("finca_id")),
    variedad: emptyToUndefined(formData.get("variedad")),
    soca: emptyToUndefined(formData.get("soca")),
    fecha_plantacion: emptyToUndefined(formData.get("fecha_plantacion")),
    estado: formData.get("estado"),
    arriendo: emptyToUndefined(formData.get("arriendo")),
    arriendo_obs: emptyToUndefined(formData.get("arriendo_obs")),
    lat: emptyToUndefined(formData.get("lat")),
    lon: emptyToUndefined(formData.get("lon")),
    propietario: emptyToUndefined(formData.get("propietario")),
    contrato: emptyToUndefined(formData.get("contrato")),
    obs: emptyToUndefined(formData.get("obs")),
  });
}

export async function saveLote(
  _prevState: LoteActionState,
  formData: FormData,
): Promise<LoteActionState> {
  const parsed = parseLoteForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { idOriginal, finca_id, fecha_plantacion, ...rest } = parsed.data;

  const supabase = await createClient();

  // Renombrar lotes.id (si cambió) cascadea automáticamente a trabajos.lote_id y
  // receta_lotes.lote_id vía "on update cascade" (supabase/migrations schema.sql),
  // replicando el comportamiento de saveLoteModal() en index_10.html:2334.
  const row = {
    ...rest,
    finca_id: finca_id ?? null,
    fecha_plantacion: fecha_plantacion ?? null,
  };

  if (idOriginal) {
    const { error } = await supabase
      .from("lotes")
      .update(row)
      .eq("id", idOriginal);
    if (error) return { status: "error", error: error.message };
  } else {
    const { error } = await supabase.from("lotes").insert(row);
    if (error) return { status: "error", error: error.message };
  }

  revalidatePath("/campo/lotes");
  return { status: "success" };
}

export async function deleteLote(id: string) {
  const supabase = await createClient();
  await supabase.from("lotes").delete().eq("id", id);
  revalidatePath("/campo/lotes");
}
