// Carga _LIBRETA_DEFAULT (index_10.html:1297-1433, ~135 despachos reales) y
// _BAJAS_DEFAULT (index_10.html:1435-1438) a `cps_campo` y `bajas_arca`. Correr UNA VEZ.
// Usa upsert por `cp`, se puede re-correr sin duplicar.
//
//   npx tsx scripts/seed-legacy-libreta.ts            # aplica los cambios
//   npx tsx scripts/seed-legacy-libreta.ts --dry-run   # solo muestra qué haría
import { readFileSync } from "node:fs";
import {
  LEGACY_HTML_PATH,
  createAdminScriptClient,
  evalArrayLiteral,
  extractArrayLiteral,
} from "./supabase-admin";

type LegacyLibretaRow = {
  cp: number;
  fecha: string;
  camion: string;
  obs: string;
};

type LegacyBajaRow = {
  cp: number;
  fecha: string;
  motivo: string;
  obs: string;
  gestionado: boolean;
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const html = readFileSync(LEGACY_HTML_PATH, "utf8");

  const libretaRows = evalArrayLiteral<LegacyLibretaRow>(
    extractArrayLiteral(html, "_LIBRETA_DEFAULT"),
  );
  const bajaRows = evalArrayLiteral<LegacyBajaRow>(
    extractArrayLiteral(html, "_BAJAS_DEFAULT"),
  );
  console.log(
    `Leídas ${libretaRows.length} filas de _LIBRETA_DEFAULT y ${bajaRows.length} de _BAJAS_DEFAULT`,
  );

  if (dryRun) {
    console.log("Dry run — primeras 3 filas de libreta:", libretaRows.slice(0, 3));
    console.log("Dry run — bajas:", bajaRows);
    return;
  }

  const supabase = createAdminScriptClient();

  const { error: libretaError } = await supabase.from("cps_campo").upsert(
    libretaRows.map((r) => ({
      cp: r.cp,
      fecha: r.fecha,
      camion: r.camion,
      obs: r.obs,
      source: "legacy_seed" as const,
    })),
    { onConflict: "cp" },
  );
  if (libretaError) throw libretaError;
  console.log(`✅ ${libretaRows.length} despachos cargados en cps_campo.`);

  if (bajaRows.length > 0) {
    const { error: bajasError } = await supabase.from("bajas_arca").upsert(
      bajaRows.map((b) => ({
        cp: b.cp,
        fecha: b.fecha,
        motivo: b.motivo,
        obs: b.obs,
        gestionado: b.gestionado,
      })),
      { onConflict: "cp" },
    );
    if (bajasError) throw bajasError;
    console.log(`✅ ${bajaRows.length} bajas ARCA cargadas en bajas_arca.`);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
