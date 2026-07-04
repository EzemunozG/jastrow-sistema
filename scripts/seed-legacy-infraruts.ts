// Carga el array INFRARUTS hardcodeado en index_10.html:852-1002 (~150 filas reales del
// ingenio) a la tabla `infraruts`. Correr UNA VEZ. Usa upsert por `cp`, así que se puede
// re-correr sin duplicar si hace falta corregir algo.
//
//   npx tsx scripts/seed-legacy-infraruts.ts            # aplica los cambios
//   npx tsx scripts/seed-legacy-infraruts.ts --dry-run   # solo muestra qué haría
import { readFileSync } from "node:fs";
import {
  LEGACY_HTML_PATH,
  createAdminScriptClient,
  evalArrayLiteral,
  extractArrayLiteral,
} from "./supabase-admin";

type LegacyInfraruto = {
  cp: number;
  remito: number;
  fecha: string;
  finca: string;
  veh: number;
  maq: number;
  kg_neto: number;
  kg_trash: number;
  kg_azucar: number;
  brix: number;
  pol: number;
  pureza: number;
  rdto: number;
};

// index_10.html clasifica por substring: todo lo que no dice LOTE4 es LA VIRGINIA
// (mismo criterio que actions/infraruts.ts para las importaciones reales por Excel).
function resolveFincaId(fincaRaw: string): "LOTE4" | "VIRGINIA" {
  return fincaRaw.toUpperCase().includes("LOTE4") ? "LOTE4" : "VIRGINIA";
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const html = readFileSync(LEGACY_HTML_PATH, "utf8");
  const literal = extractArrayLiteral(html, "INFRARUTS");
  const rows = evalArrayLiteral<LegacyInfraruto>(literal);
  console.log(`Leídas ${rows.length} filas de INFRARUTS desde index_10.html`);

  if (dryRun) {
    console.log("Dry run — primeras 3 filas mapeadas:");
    console.log(
      rows.slice(0, 3).map((r) => ({
        cp: r.cp,
        remito: r.remito,
        fecha: r.fecha,
        finca_raw: r.finca,
        finca_id: resolveFincaId(r.finca),
      })),
    );
    return;
  }

  const supabase = createAdminScriptClient();

  const { data: importRow, error: importError } = await supabase
    .from("infraruts_imports")
    .insert({
      filename: "index_10.html (INFRARUTS hardcodeado)",
      row_count: rows.length,
      status: "legacy_seed",
    })
    .select("id")
    .single();
  if (importError) throw importError;

  const { error } = await supabase.from("infraruts").upsert(
    rows.map((r) => ({
      cp: r.cp,
      remito: r.remito,
      fecha: r.fecha,
      finca_raw: r.finca,
      finca_id: resolveFincaId(r.finca),
      veh: r.veh,
      maq: r.maq,
      kg_neto: r.kg_neto,
      kg_trash: r.kg_trash,
      kg_azucar: r.kg_azucar,
      brix: r.brix,
      pol: r.pol,
      pureza: r.pureza,
      rdto: r.rdto,
      import_batch_id: importRow.id,
    })),
    { onConflict: "cp" },
  );
  if (error) throw error;

  console.log(
    `✅ ${rows.length} filas cargadas en infraruts (import_batch_id=${importRow.id}).`,
  );
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
