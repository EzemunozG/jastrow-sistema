"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addBajaArcaSchema, type BajaArcaActionState } from "@/lib/forms/bajas-arca";

function emptyToUndefined(v: FormDataEntryValue | null) {
  const s = (v as string) ?? "";
  return s.trim() === "" ? undefined : s;
}

function revalidateViajes() {
  revalidatePath("/viajes/reconciliacion");
  revalidatePath("/viajes/listado");
  revalidatePath("/viajes/libreta");
}

// index_10.html:1737-1749 (addBajaArca)
export async function addBajaArca(
  _prevState: BajaArcaActionState,
  formData: FormData,
): Promise<BajaArcaActionState> {
  const parsed = addBajaArcaSchema.safeParse({
    cp: formData.get("cp"),
    fecha: emptyToUndefined(formData.get("fecha")),
    motivo: emptyToUndefined(formData.get("motivo")),
    obs: emptyToUndefined(formData.get("obs")),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("bajas_arca")
    .select("cp")
    .eq("cp", parsed.data.cp)
    .maybeSingle();
  if (existing) {
    return { status: "error", error: "Ese CP ya está registrado como baja." };
  }

  const { error } = await supabase.from("bajas_arca").insert({
    cp: parsed.data.cp,
    fecha: parsed.data.fecha || null,
    motivo: parsed.data.motivo || null,
    obs: parsed.data.obs || null,
    gestionado: false,
  });
  if (error) return { status: "error", error: error.message };

  revalidateViajes();
  return { status: "success" };
}

// index_10.html:1731 (toggleGestionBaja, onclick inline en el pill de estado)
export async function toggleGestionBaja(cp: number, gestionado: boolean) {
  const supabase = await createClient();
  await supabase.from("bajas_arca").update({ gestionado }).eq("cp", cp);
  revalidateViajes();
}

// index_10.html:1751-1755 (deleteBajaArca)
export async function deleteBajaArca(cp: number) {
  const supabase = await createClient();
  await supabase.from("bajas_arca").delete().eq("cp", cp);
  revalidateViajes();
}
