"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BajaCandidata, LibretaRow } from "@/lib/excel/parse-libreta";
import {
  addCpsCampoSchema,
  addCpsListaSchema,
  parseCpInput,
  parseCpLista,
  type CpsCampoActionState,
} from "@/lib/forms/cps-campo";

function emptyToUndefined(v: FormDataEntryValue | null) {
  const s = (v as string) ?? "";
  return s.trim() === "" ? undefined : s;
}

export type ImportLibretaResult =
  | { status: "success"; count: number; bajas: number }
  | { status: "error"; error: string };

export async function importLibreta(
  rows: LibretaRow[],
  bajasCandidatas: BajaCandidata[],
): Promise<ImportLibretaResult> {
  if (rows.length === 0) {
    return { status: "error", error: "No hay filas válidas para importar." };
  }

  const supabase = await createClient();

  // El Excel siempre pisa lo que ya estaba guardado para ese CP (index_10.html:1600-1605:
  // "MERGE con lo existente... Los CP del Excel actualizan los guardados").
  const { error } = await supabase.from("cps_campo").upsert(
    rows.map((r) => ({
      cp: r.cp,
      fecha: r.fecha,
      camion: r.camion,
      obs: r.obs,
      source: "excel_import" as const,
    })),
    { onConflict: "cp" },
  );
  if (error) return { status: "error", error: error.message };

  // Las bajas detectadas (obs con "BAJA") solo se agregan si no existían — nunca pisan
  // una baja ya gestionada a mano (index_10.html:1608-1613).
  if (bajasCandidatas.length > 0) {
    const { error: bajasError } = await supabase.from("bajas_arca").upsert(
      bajasCandidatas.map((b) => ({
        cp: b.cp,
        fecha: b.fecha,
        motivo: b.motivo,
        obs: b.obs,
      })),
      { onConflict: "cp", ignoreDuplicates: true },
    );
    if (bajasError) return { status: "error", error: bajasError.message };
  }

  revalidatePath("/viajes/libreta");
  revalidatePath("/viajes/listado");
  revalidatePath("/viajes/reconciliacion");
  return {
    status: "success",
    count: rows.length,
    bajas: bajasCandidatas.length,
  };
}

function revalidateViajes() {
  revalidatePath("/viajes/reconciliacion");
  revalidatePath("/viajes/listado");
  revalidatePath("/viajes/libreta");
}

// index_10.html:1461-1477 (addCPCampo) — CP individual o rango, nunca pisa un CP que ya
// esté cargado (ni de la libreta importada ni de otra alta manual).
export async function addCpsCampo(
  _prevState: CpsCampoActionState,
  formData: FormData,
): Promise<CpsCampoActionState> {
  const parsed = addCpsCampoSchema.safeParse({
    raw: formData.get("raw"),
    fecha: emptyToUndefined(formData.get("fecha")),
    camion: emptyToUndefined(formData.get("camion")),
    obs: emptyToUndefined(formData.get("obs")),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const cps = parseCpInput(parsed.data.raw);
  if (cps.length === 0) {
    return {
      status: "error",
      error: "Formato inválido. Usá un número (4350) o rango (4350-4380).",
    };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("cps_campo")
    .select("cp")
    .in("cp", cps);
  const existingSet = new Set((existing ?? []).map((r) => r.cp));
  const toInsert = cps.filter((cp) => !existingSet.has(cp));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("cps_campo").insert(
      toInsert.map((cp) => ({
        cp,
        fecha: parsed.data.fecha || null,
        camion: parsed.data.camion || null,
        obs: parsed.data.obs || null,
        source: "manual" as const,
      })),
    );
    if (error) return { status: "error", error: error.message };
  }

  revalidateViajes();
  return {
    status: "success",
    added: toInsert.length,
    skipped: cps.length - toInsert.length,
  };
}

// index_10.html:1479-1492 (addCPLista) — lista pegada separada por comas/saltos de línea.
export async function addCpsLista(
  _prevState: CpsCampoActionState,
  formData: FormData,
): Promise<CpsCampoActionState> {
  const parsed = addCpsListaSchema.safeParse({
    raw: formData.get("raw"),
    fecha: emptyToUndefined(formData.get("fecha")),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const cps = parseCpLista(parsed.data.raw);
  if (cps.length === 0) {
    return {
      status: "error",
      error: "No se encontraron números válidos en la lista.",
    };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("cps_campo")
    .select("cp")
    .in("cp", cps);
  const existingSet = new Set((existing ?? []).map((r) => r.cp));
  const toInsert = cps.filter((cp) => !existingSet.has(cp));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("cps_campo").insert(
      toInsert.map((cp) => ({
        cp,
        fecha: parsed.data.fecha || null,
        camion: null,
        obs: "Cargado por lista",
        source: "manual" as const,
      })),
    );
    if (error) return { status: "error", error: error.message };
  }

  revalidateViajes();
  return {
    status: "success",
    added: toInsert.length,
    skipped: cps.length - toInsert.length,
  };
}

export async function deleteCpCampo(cp: number) {
  const supabase = await createClient();
  await supabase.from("cps_campo").delete().eq("cp", cp);
  revalidateViajes();
}
