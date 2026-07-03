"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const loteSchema = z.object({
  id: z.string().min(1, "El ID del lote es obligatorio"),
  idOriginal: z.string().optional(), // presente al editar, para permitir renombrar el id
  nombre: z.string().optional(),
  ha: z.coerce.number().positive("Las hectáreas deben ser mayores a 0"),
  tipo: z.enum(["Propio", "Arrendado"]),
  finca_id: z.string().optional(),
  variedad: z.string().optional(),
  soca: z.coerce.number().int().nonnegative().optional(),
  fecha_plantacion: z.string().optional(),
  estado: z.enum(["Pendiente", "En cosecha", "Cosechado"]),
  arriendo: z.coerce.number().nonnegative().optional(),
  arriendo_obs: z.string().optional(),
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
  propietario: z.string().optional(),
  contrato: z.string().optional(),
  obs: z.string().optional(),
});

export type LoteFormValues = z.input<typeof loteSchema>;

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

export type LoteActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export const LOTE_ACTION_IDLE: LoteActionState = { status: "idle" };

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
