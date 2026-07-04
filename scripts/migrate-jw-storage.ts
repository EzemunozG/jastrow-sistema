// Migra la tabla KV `jw_storage` del HTML legacy (mismo proyecto Supabase, tabla vieja
// que queda archivada, no se borra) a las tablas relacionales nuevas. Correr UNA VEZ,
// antes de decomisionar index_10.html — ver CLAUDE.md "Migración de datos existentes".
//
// Al 2026-07-03 (fecha de este script) `jw_storage` solo tiene las keys `cps_campo_v2`
// (vacía) y `users` (ya migrada a mano a Supabase Auth, ver ROADMAP) — lotes/facturas/
// trabajos/bajas_arca_v2/precio_bolsa todavía no existen como key porque la familia no
// llegó a cargar nada ahí antes de este rewrite. El mapeo de esas keys SÍ está
// implementado acá (para no tener que rehacerlo después), pero **no se pudo probar
// contra datos reales poblados** porque no existen todavía — revisar con cuidado el día
// que sí haya algo que migrar de verdad. `stock`/`recetas` quedan afuera a propósito:
// esas tablas son del milestone 8 (todavía sin actions/UI propios) — agregar su mapeo
// ahí, no acá, para no adivinar la forma exacta sin haber construido antes el resto del
// milestone.
//
//   npx tsx scripts/migrate-jw-storage.ts            # aplica los cambios
//   npx tsx scripts/migrate-jw-storage.ts --dry-run   # solo muestra qué haría
import { createAdminScriptClient } from "./supabase-admin";

type JwLote = {
  id: string;
  nombre?: string;
  ha: number;
  tipo: "Propio" | "Arrendado";
  finca?: string;
  variedad?: string;
  soca?: number;
  fplant?: string;
  estado: "Pendiente" | "En cosecha" | "Cosechado";
  arriendo?: number;
  arriendo_obs?: string;
  lat?: number | null;
  lon?: number | null;
  propietario?: string;
  contrato?: string;
  obs?: string;
};

type JwFacturaItem = {
  desc: string;
  cantidad: number;
  unidad: string;
  precio_unit: number;
  total: number;
};

type JwFactura = {
  id: string;
  numero: string;
  tipo: string;
  proveedor: string;
  cuit?: string;
  fecha: string;
  categoria: string;
  obs?: string;
  items: JwFacturaItem[];
  total: number;
  img?: string | null; // data URL base64
};

type JwTrabajoInsumo = {
  desc: string;
  cantidad: number;
  unidad: string;
  precio_unit: number;
  total: number;
  factura_ref?: string; // guarda facturas.numero, no facturas.id (index_10.html)
};

type JwTrabajo = {
  id: string;
  loteId: string;
  fecha: string;
  tipo: string;
  ha?: number;
  empresa?: string;
  obs?: string;
  insumos: JwTrabajoInsumo[];
  costo_labor: number;
  costo_insumos: number;
};

type JwCpCampo = { cp: number; fecha?: string; camion?: string; obs?: string };
type JwBaja = {
  cp: number;
  fecha?: string;
  motivo?: string;
  obs?: string;
  gestionado?: boolean;
};

function resolveFincaId(finca: string | undefined): "LOTE4" | "VIRGINIA" | null {
  if (!finca) return null;
  const u = finca.toUpperCase();
  if (u.includes("LOTE4")) return "LOTE4";
  if (u.includes("VIRGINIA")) return "VIRGINIA";
  return null;
}

async function dataUrlToUpload(
  supabase: ReturnType<typeof createAdminScriptClient>,
  facturaId: string,
  dataUrl: string,
): Promise<string | null> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, mime, base64] = match;
  const ext = mime.split("/")[1] ?? "bin";
  const buffer = Buffer.from(base64, "base64");
  const path = `${facturaId}/legacy.${ext}`;
  const { error } = await supabase.storage
    .from("facturas-imgs")
    .upload(path, buffer, { contentType: mime, upsert: true });
  if (error) {
    console.warn(`  ⚠ no se pudo subir la imagen de la factura ${facturaId}:`, error.message);
    return null;
  }
  return path;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const supabase = createAdminScriptClient();

  const { data: rows, error } = await supabase
    .from("jw_storage")
    .select("key, value");
  if (error) throw error;

  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const skip = (key: string, reason: string) =>
    console.log(`⏭  ${key}: ${reason}`);

  // ---- lotes ----
  const lotes = (byKey.get("lotes") as JwLote[] | undefined) ?? [];
  if (lotes.length === 0) {
    skip("lotes", "key ausente o vacía, nada que migrar");
  } else {
    console.log(`lotes: ${lotes.length} filas`);
    if (!dryRun) {
      const { error: e } = await supabase.from("lotes").upsert(
        lotes.map((l) => ({
          id: l.id,
          nombre: l.nombre || null,
          ha: l.ha,
          tipo: l.tipo,
          finca_id: resolveFincaId(l.finca),
          variedad: l.variedad || null,
          soca: l.soca ?? 0,
          fecha_plantacion: l.fplant || null,
          estado: l.estado,
          arriendo: l.arriendo ?? 0,
          arriendo_obs: l.arriendo_obs || null,
          lat: l.lat ?? null,
          lon: l.lon ?? null,
          propietario: l.propietario || null,
          contrato: l.contrato || null,
          obs: l.obs || null,
        })),
        { onConflict: "id" },
      );
      if (e) throw e;
    }
    console.log(`✅ lotes migrados`);
  }

  // ---- facturas + factura_items (+ imagen a Storage si tenía) ----
  const facturas = (byKey.get("facturas") as JwFactura[] | undefined) ?? [];
  const numeroToId = new Map(facturas.map((f) => [f.numero, f.id]));
  if (facturas.length === 0) {
    skip("facturas", "key ausente o vacía, nada que migrar");
  } else {
    console.log(`facturas: ${facturas.length} filas`);
    if (!dryRun) {
      for (const f of facturas) {
        let img_path: string | null = null;
        if (f.img) img_path = await dataUrlToUpload(supabase, f.id, f.img);
        const { error: e } = await supabase.from("facturas").upsert(
          {
            id: f.id,
            numero: f.numero,
            tipo: f.tipo,
            proveedor: f.proveedor,
            cuit: f.cuit || null,
            fecha: f.fecha,
            categoria: f.categoria,
            obs: f.obs || null,
            total: f.total,
            total_moneda: "ARS",
            img_path,
          },
          { onConflict: "id" },
        );
        if (e) throw e;
        await supabase.from("factura_items").delete().eq("factura_id", f.id);
        if (f.items.length > 0) {
          const { error: e2 } = await supabase.from("factura_items").insert(
            f.items.map((it) => ({
              factura_id: f.id,
              descripcion: it.desc,
              cantidad: it.cantidad,
              unidad: it.unidad,
              precio_unit: it.precio_unit,
            })),
          );
          if (e2) throw e2;
        }
      }
    }
    console.log(`✅ facturas migradas`);
  }

  // ---- trabajos + trabajo_insumos ----
  const trabajos = (byKey.get("trabajos") as JwTrabajo[] | undefined) ?? [];
  if (trabajos.length === 0) {
    skip("trabajos", "key ausente o vacía, nada que migrar");
  } else {
    console.log(`trabajos: ${trabajos.length} filas`);
    if (!dryRun) {
      for (const t of trabajos) {
        const { data: trabajoRow, error: e } = await supabase
          .from("trabajos")
          .insert({
            lote_id: t.loteId || null,
            fecha: t.fecha,
            tipo: t.tipo,
            ha: t.ha ?? null,
            empresa: t.empresa || null,
            obs: t.obs || null,
            costo_labor: t.costo_labor ?? 0,
            costo_insumos: t.costo_insumos ?? 0,
          })
          .select("id")
          .single();
        if (e) throw e;
        if (t.insumos.length > 0) {
          const { error: e2 } = await supabase.from("trabajo_insumos").insert(
            t.insumos.map((it) => ({
              trabajo_id: trabajoRow.id,
              descripcion: it.desc,
              cantidad: it.cantidad,
              unidad: it.unidad,
              precio_unit: it.precio_unit,
              factura_id: it.factura_ref
                ? (numeroToId.get(it.factura_ref) ?? null)
                : null,
            })),
          );
          if (e2) throw e2;
        }
      }
    }
    console.log(`✅ trabajos migrados`);
  }

  // ---- cps_campo_v2 (solo los agregados a mano, ver getCPsCampo()) ----
  const cpsCampo = (byKey.get("cps_campo_v2") as JwCpCampo[] | undefined) ?? [];
  if (cpsCampo.length === 0) {
    skip("cps_campo_v2", "vacía — ya está reemplazada por scripts/seed-legacy-libreta.ts");
  } else {
    console.log(`cps_campo_v2: ${cpsCampo.length} filas`);
    if (!dryRun) {
      const { error: e } = await supabase.from("cps_campo").upsert(
        cpsCampo.map((x) => ({
          cp: x.cp,
          fecha: x.fecha || null,
          camion: x.camion || null,
          obs: x.obs || null,
          source: "manual" as const,
        })),
        { onConflict: "cp" },
      );
      if (e) throw e;
    }
    console.log(`✅ cps_campo_v2 migrada`);
  }

  // ---- bajas_arca_v2 ----
  const bajas = (byKey.get("bajas_arca_v2") as JwBaja[] | undefined) ?? [];
  if (bajas.length === 0) {
    skip("bajas_arca_v2", "vacía — ya está reemplazada por scripts/seed-legacy-libreta.ts");
  } else {
    console.log(`bajas_arca_v2: ${bajas.length} filas`);
    if (!dryRun) {
      const { error: e } = await supabase.from("bajas_arca").upsert(
        bajas.map((b) => ({
          cp: b.cp,
          fecha: b.fecha || null,
          motivo: b.motivo || null,
          obs: b.obs || null,
          gestionado: b.gestionado ?? false,
        })),
        { onConflict: "cp" },
      );
      if (e) throw e;
    }
    console.log(`✅ bajas_arca_v2 migrada`);
  }

  // ---- precio_bolsa (escalar -> app_settings) ----
  const precioBolsa = byKey.get("precio_bolsa") as number | undefined;
  if (precioBolsa == null) {
    skip("precio_bolsa", "key ausente, se mantiene el default de app_settings");
  } else {
    console.log(`precio_bolsa: ${precioBolsa}`);
    if (!dryRun) {
      const { error: e } = await supabase
        .from("app_settings")
        .update({ precio_bolsa: precioBolsa, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (e) throw e;
    }
    console.log(`✅ precio_bolsa migrado`);
  }

  // ---- stock / recetas: milestone 8, no implementado acá a propósito ----
  for (const key of ["stock", "recetas"]) {
    if (byKey.has(key)) {
      console.log(
        `⚠ ${key}: hay datos en jw_storage pero este script todavía no los migra ` +
          `(milestone 8) — no se pierden, solo quedan pendientes.`,
      );
    }
  }

  if (dryRun) console.log("\n(dry run — no se escribió nada)");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
