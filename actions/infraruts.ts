"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { InfrarutImportRow } from "@/lib/excel/parse-infraruts";

// index_10.html solo distinguía dos fincas comparando substring: `r.finca.includes('LOTE4')`
// — todo lo que no matchea LOTE4 se trata como LA VIRGINIA. Se preserva ese criterio tal
// cual para no introducir un tercer estado (finca_id null) que el HTML legacy no tenía.
function resolveFincaId(fincaRaw: string): "LOTE4" | "VIRGINIA" {
  return fincaRaw.toUpperCase().includes("LOTE4") ? "LOTE4" : "VIRGINIA";
}

export type ImportInfrarutsResult =
  | { status: "success"; count: number }
  | { status: "error"; error: string };

export async function importInfraruts(
  filename: string,
  rows: InfrarutImportRow[],
): Promise<ImportInfrarutsResult> {
  const profile = await requireAdmin();
  if (rows.length === 0) {
    return { status: "error", error: "No hay filas válidas para importar." };
  }

  const supabase = await createClient();

  const { data: importRow, error: importError } = await supabase
    .from("infraruts_imports")
    .insert({
      filename,
      uploaded_by: profile.id,
      row_count: rows.length,
      status: "committed",
    })
    .select("id")
    .single();
  if (importError) return { status: "error", error: importError.message };

  // upsert por cp: permite reimportar el mismo archivo (o uno corregido) sin duplicar filas.
  const { error: rowsError } = await supabase.from("infraruts").upsert(
    rows.map((r) => ({
      cp: r.cp,
      remito: r.remito,
      fecha: r.fecha,
      finca_raw: r.fincaRaw,
      finca_id: resolveFincaId(r.fincaRaw),
      veh: r.veh,
      maq: r.maq,
      kg_neto: r.kgNeto,
      kg_trash: r.kgTrash,
      kg_azucar: r.kgAzucar,
      brix: r.brix,
      pol: r.pol,
      pureza: r.pureza,
      rdto: r.rdto,
      import_batch_id: importRow.id,
    })),
    { onConflict: "cp" },
  );
  if (rowsError) return { status: "error", error: rowsError.message };

  revalidatePath("/resumen");
  revalidatePath("/tendencia");
  revalidatePath("/campo/costos");
  return { status: "success", count: rows.length };
}
