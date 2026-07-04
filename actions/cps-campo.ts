"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BajaCandidata, LibretaRow } from "@/lib/excel/parse-libreta";

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
