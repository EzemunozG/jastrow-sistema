// Carga los datos reales hardcodeados en index_10.html que quedaron afuera de
// migrate-jw-storage.ts (esos vienen de `gSt('key') || [...]`, no de la tabla jw_storage,
// que está casi vacía — ver ROADMAP.md milestone 6): 15 lotes reales (getLotes, ~2003),
// 9 facturas reales (getFacturas, ~2027), 11 productos de stock con sus movimientos
// (getStock, ~2717) y 6 recetas reales (getRecetas, ~2768).
//
// Idempotente: upsert por id en las tablas padre (lotes/productos/recetas/facturas) y
// delete-then-insert por parent id en las tablas hijas (receta_lotes, receta_items,
// movimientos_stock, factura_items), que usan uuid autogenerado sin key natural.
//
//   npx tsx scripts/seed-legacy-campo-stock.ts            # aplica los cambios
//   npx tsx scripts/seed-legacy-campo-stock.ts --dry-run   # solo muestra qué haría
import { readFileSync } from "node:fs";
import {
  LEGACY_HTML_PATH,
  createAdminScriptClient,
  evalArrayLiteral,
  extractGstArrayLiteral,
} from "./supabase-admin";

type LegacyLote = {
  id: string;
  nombre: string;
  ha: number;
  tipo: "Propio" | "Arrendado";
  finca: string;
  variedad: string;
  soca: number;
  fplant: string;
  estado: "Pendiente" | "En cosecha" | "Cosechado";
  arriendo: number;
  arriendo_obs?: string;
  lat: number | null;
  lon: number | null;
  propietario: string;
  contrato: string;
  obs: string;
};

type LegacyFacturaItem = {
  desc: string;
  cantidad: number;
  unidad: string;
  precio_unit: number;
  total: number;
};
type LegacyFactura = {
  id: string;
  numero: string;
  tipo: string;
  proveedor: string;
  cuit: string;
  fecha: string;
  categoria: string;
  obs: string;
  items: LegacyFacturaItem[];
  total: number;
  img: string | null;
};

type LegacyMovimiento = {
  id: string;
  tipo: "entrada" | "salida";
  fecha: string;
  cantidad: number;
  precio_unit: number;
  total: number;
  origen: string;
  obs?: string;
};
type LegacyProducto = {
  id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  movimientos: LegacyMovimiento[];
};

type LegacyRecetaItem = {
  prod_id: string;
  nombre: string;
  dosis: number;
  unidad: string;
  cantidad: number;
  precio_unit: number;
  total: number;
};
type LegacyReceta = {
  id: string;
  nombre: string;
  fecha: string;
  tipo: string;
  lotes: string[];
  ha: number;
  empresa: string;
  obs: string;
  items: LegacyRecetaItem[];
  costo_total: number;
  costo_ha: number;
};

function normalizePlaceholder(v: string | undefined | null): string | null {
  if (v == null) return null;
  const trimmed = v.trim();
  return trimmed === "" || trimmed === "—" ? null : trimmed;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const html = readFileSync(LEGACY_HTML_PATH, "utf8");

  const lotes = evalArrayLiteral<LegacyLote>(
    extractGstArrayLiteral(html, "lotes"),
  );
  const facturas = evalArrayLiteral<LegacyFactura>(
    extractGstArrayLiteral(html, "facturas"),
  );
  const productos = evalArrayLiteral<LegacyProducto>(
    extractGstArrayLiteral(html, "stock"),
  );
  const recetas = evalArrayLiteral<LegacyReceta>(
    extractGstArrayLiteral(html, "recetas"),
  );

  console.log(
    `Leídos: ${lotes.length} lotes, ${facturas.length} facturas, ${productos.length} productos de stock, ${recetas.length} recetas.`,
  );

  if (dryRun) {
    console.log("\nDry run — lotes:", lotes.map((l) => l.id));
    console.log("Dry run — facturas:", facturas.map((f) => f.id));
    console.log("Dry run — productos:", productos.map((p) => p.id));
    console.log("Dry run — recetas:", recetas.map((r) => r.id));
    console.log(
      "\nEjemplo lote mapeado:",
      JSON.stringify(
        {
          id: lotes[0].id,
          ha: lotes[0].ha,
          tipo: lotes[0].tipo,
          finca_id: lotes[0].finca,
          variedad: normalizePlaceholder(lotes[0].variedad),
          fecha_plantacion: normalizePlaceholder(lotes[0].fplant),
        },
        null,
        2,
      ),
    );
    return;
  }

  const supabase = createAdminScriptClient();

  // 1) Lotes (padre de receta_lotes)
  const { error: lotesErr } = await supabase.from("lotes").upsert(
    lotes.map((l) => ({
      id: l.id,
      nombre: normalizePlaceholder(l.nombre),
      ha: l.ha,
      tipo: l.tipo,
      finca_id: l.finca,
      variedad: normalizePlaceholder(l.variedad),
      soca: l.soca,
      fecha_plantacion: normalizePlaceholder(l.fplant),
      estado: l.estado,
      arriendo: l.arriendo,
      arriendo_obs: normalizePlaceholder(l.arriendo_obs),
      lat: l.lat,
      lon: l.lon,
      propietario: normalizePlaceholder(l.propietario),
      contrato: normalizePlaceholder(l.contrato),
      obs: normalizePlaceholder(l.obs),
    })),
    { onConflict: "id" },
  );
  if (lotesErr) throw lotesErr;
  console.log(`✅ ${lotes.length} lotes.`);

  // 2) Productos (padre de movimientos_stock y receta_items)
  const { error: productosErr } = await supabase.from("productos").upsert(
    productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      unidad: p.unidad,
    })),
    { onConflict: "id" },
  );
  if (productosErr) throw productosErr;
  console.log(`✅ ${productos.length} productos.`);

  // 3) Recetas (padre de receta_lotes, receta_items, movimientos_stock.receta_id)
  const { error: recetasErr } = await supabase.from("recetas").upsert(
    recetas.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      fecha: r.fecha,
      tipo: r.tipo,
      ha: r.ha,
      empresa: normalizePlaceholder(r.empresa),
      obs: normalizePlaceholder(r.obs),
      costo_total: r.costo_total,
      costo_ha: r.costo_ha,
    })),
    { onConflict: "id" },
  );
  if (recetasErr) throw recetasErr;
  console.log(`✅ ${recetas.length} recetas.`);

  const recetaIds = recetas.map((r) => r.id);

  // 4) receta_lotes — delete-then-insert por receta_id (child sin key natural)
  const { error: delRecetaLotesErr } = await supabase
    .from("receta_lotes")
    .delete()
    .in("receta_id", recetaIds);
  if (delRecetaLotesErr) throw delRecetaLotesErr;
  const recetaLotesRows = recetas.flatMap((r) =>
    r.lotes.map((loteId) => ({ receta_id: r.id, lote_id: loteId })),
  );
  if (recetaLotesRows.length > 0) {
    const { error } = await supabase.from("receta_lotes").insert(recetaLotesRows);
    if (error) throw error;
  }
  console.log(`✅ ${recetaLotesRows.length} vínculos receta_lotes.`);

  // 5) receta_items — delete-then-insert por receta_id
  const { error: delRecetaItemsErr } = await supabase
    .from("receta_items")
    .delete()
    .in("receta_id", recetaIds);
  if (delRecetaItemsErr) throw delRecetaItemsErr;
  const recetaItemsRows = recetas.flatMap((r) =>
    r.items.map((it) => ({
      receta_id: r.id,
      producto_id: it.prod_id,
      dosis: it.dosis,
      unidad: it.unidad,
      cantidad: it.cantidad,
      precio_unit: it.precio_unit,
    })),
  );
  if (recetaItemsRows.length > 0) {
    const { error } = await supabase.from("receta_items").insert(recetaItemsRows);
    if (error) throw error;
  }
  console.log(`✅ ${recetaItemsRows.length} receta_items.`);

  // 6) movimientos_stock — delete-then-insert por producto_id. Si el `origen` legacy
  // menciona una receta seedeada (ej. "Receta REC-001 — ..."), se linkea receta_id.
  const productoIds = productos.map((p) => p.id);
  const { error: delMovErr } = await supabase
    .from("movimientos_stock")
    .delete()
    .in("producto_id", productoIds);
  if (delMovErr) throw delMovErr;
  const movimientosRows = productos.flatMap((p) =>
    p.movimientos.map((m) => {
      const recetaMatch = /REC-\d+/.exec(m.origen);
      const recetaId =
        recetaMatch && recetaIds.includes(recetaMatch[0]) ? recetaMatch[0] : null;
      return {
        producto_id: p.id,
        tipo: m.tipo,
        fecha: m.fecha,
        cantidad: m.cantidad,
        precio_unit: m.precio_unit,
        origen: normalizePlaceholder(m.origen),
        obs: normalizePlaceholder(m.obs),
        receta_id: recetaId,
      };
    }),
  );
  if (movimientosRows.length > 0) {
    const { error } = await supabase.from("movimientos_stock").insert(movimientosRows);
    if (error) throw error;
  }
  console.log(`✅ ${movimientosRows.length} movimientos_stock.`);

  // 7) Facturas (independiente, sin FK cruzada con lo anterior)
  const { error: facturasErr } = await supabase.from("facturas").upsert(
    facturas.map((f) => ({
      id: f.id,
      numero: f.numero,
      tipo: f.tipo,
      proveedor: f.proveedor,
      cuit: f.cuit,
      fecha: f.fecha,
      categoria: f.categoria,
      obs: normalizePlaceholder(f.obs),
      total: f.total,
      img_path: null,
    })),
    { onConflict: "id" },
  );
  if (facturasErr) throw facturasErr;
  console.log(`✅ ${facturas.length} facturas.`);

  // 8) factura_items — delete-then-insert por factura_id
  const facturaIds = facturas.map((f) => f.id);
  const { error: delFacturaItemsErr } = await supabase
    .from("factura_items")
    .delete()
    .in("factura_id", facturaIds);
  if (delFacturaItemsErr) throw delFacturaItemsErr;
  const facturaItemsRows = facturas.flatMap((f) =>
    f.items.map((it) => ({
      factura_id: f.id,
      descripcion: it.desc,
      cantidad: it.cantidad,
      unidad: it.unidad,
      precio_unit: it.precio_unit,
    })),
  );
  if (facturaItemsRows.length > 0) {
    const { error } = await supabase.from("factura_items").insert(facturaItemsRows);
    if (error) throw error;
  }
  console.log(`✅ ${facturaItemsRows.length} factura_items.`);

  console.log("\n✅ Seed de Campo/Stock/Recetas completo.");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
