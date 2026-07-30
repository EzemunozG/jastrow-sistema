// "Mapa de lotes" — una tarjeta por lote con su tn/surco de número protagonista y el
// color por rdto% vs meta. Toda la lógica derivada vive acá (funciones puras), la
// page.tsx solo fetchea y llama a computeMapaLotes(). Ver app/(app)/mapa/page.tsx.
//
// Atribución de viajes a lote: idéntica a lib/alerts.ts / lib/reconciliation.ts —
// cps_campo.lote es el lote de origen del despacho, y se cruza con el INFRARUT por
// REMITO (nunca por carta de porte). Los remitos dados de baja (ARCA) se excluyen.

import { META } from "./business-rules";

// ── Umbrales de COLOR de la tarjeta: por rdto% promedio vs meta (10%). El rdto es
// comparable aunque el lote esté a medio cosechar, a diferencia del tn/surco (que
// castigaría a un lote que recién arrancó). Meta = business-rules.META (10). El corte
// de amarillo (9) es propio de esta pantalla y NO es UMBRALES.rdtoWarn (9,5): son
// cosas distintas, no mezclar (decisión del usuario, 2026-07-30).
export const RDTO_AMARILLO = 9;

// ── Umbrales de tn/surco FINAL (para cuando exista noción de "lote cerrado" y el color
// pueda pasar a tn/surco definitivo). Hoy NO se usan para colorear — el color va por
// rdto. Viven en app_settings para poder calibrarlos sin deploy; estos son solo el
// fallback si la migración de columnas todavía no se aplicó.
export const TN_SURCO_UMBRAL_DEFAULT = { verde: 5.5, amarillo: 4.5 };

export const SURCOS_POR_HA_DEFAULT = 61; // fallback si lotes_ingenio.surcos_por_ha viniera null

// ── Mapeo lote_key (libreta / lotes_ingenio) → lote(s) FÍSICO(s) (tabla `lotes`, ids
// L4-* / VA-*), para poder traer las aplicaciones (recetas/trabajos) de cada lote. La
// tabla `lotes` (Campo) y `lotes_ingenio` (cosecha) se armaron por separado y no
// comparten id ni nombre, así que este vínculo hay que declararlo a mano. PROVISORIO —
// Ezequiel confirma/corrige los que faltan (los `[]` son "no sé todavía"). Editar acá.
export const LOTE_FISICO_POR_KEY: Record<string, string[]> = {
  // Confianza alta (match por nombre / dueño / texto de receta):
  "LAS 101": ["L4-100"], // receta llama "Lote 100" al L4-100; lote_ingenio "Lote 101"
  LUCHO: ["L4-LUCHO"], // mismo nombre
  "TALA POSO 2": ["L4-TP2"], // TP2
  "TALA POSO 3": ["L4-TP3"], // TP3
  PILOT: ["L4-PILOT"], // mismo nombre (aunque el físico está en finca LOTE4)
  FRAU: ["VA-07"], // REC-004 "Lote Frau" → VA-07; VA-07 dueño = Néstor Frau
  // Guess a confirmar:
  "CASA FRAU": ["VA-08"], // VA-08 también dueño Néstor Frau — CONFIRMAR
  // Sin match evidente todavía — completar:
  TANO: [],
  PACO: [], // "JASTROW - LOTE 3" en el INFRARUT
  PAQUITO: [],
  "TALA POSO 1": [],
};

export type MapaTrip = {
  remito: number | null;
  ingenio_id: string;
  kg_neto: number;
  rdto: number | null; // puede venir null en registros provisionales — promediar solo presentes
};

export type MapaCpCampo = { cp: number; lote: string | null };
export type MapaBaja = { cp: number };

export type RecetaLoteLink = { receta_id: string; lote_id: string | null };
export type RecetaItem = {
  receta_id: string;
  producto_id: string | null;
  dosis: number | null;
  unidad: string | null;
  cantidad: number | null;
  total: number | null; // ARS
};
export type TrabajoLink = {
  id: string;
  lote_id: string | null;
  costo_labor: number | null;
  costo_total: number | null;
};
export type TrabajoInsumo = {
  trabajo_id: string;
  descripcion: string | null;
  cantidad: number | null;
  unidad: string | null;
  total: number | null; // ARS
};
export type ProductoLite = { id: string; nombre: string };

export type Aplicacion = {
  nombre: string;
  detalle: string; // dosis/cantidad
  usd: number;
};

export type ColorLote = "verde" | "amarillo" | "rojo" | "sin-cosecha";

export type LoteMapCard = {
  lote_key: string;
  nombre: string;
  ha: number;
  surcos_por_ha: number;
  viajes: number;
  kg_neto_total: number;
  cosechado_tn: number;
  tn_surco: number;
  parcial: boolean; // cosecha en curso (hoy siempre true cuando hay viajes)
  rdto_promedio: number | null;
  ingenio_id: string | null; // derivado de los viajes, NO hardcodeado
  ingenio_nombre: string | null;
  color: ColorLote;
  aplicaciones: Aplicacion[];
  gastado_usd: number;
  usd_por_ha: number;
};

function avgPresente(vals: (number | null)[]): number | null {
  const p = vals.filter((v): v is number => v != null);
  return p.length ? p.reduce((a, b) => a + b, 0) / p.length : null;
}

export function colorPorRdto(rdto: number | null): ColorLote {
  if (rdto == null) return "sin-cosecha";
  if (rdto >= META) return "verde";
  if (rdto >= RDTO_AMARILLO) return "amarillo";
  return "rojo";
}

export function computeMapaLotes(params: {
  lotesIngenio: {
    lote_key: string;
    nombre: string;
    ha: number;
    surcos_por_ha: number | null;
  }[];
  cpsCampo: MapaCpCampo[];
  trips: MapaTrip[];
  bajas: MapaBaja[];
  recetaLotes: RecetaLoteLink[];
  recetaItems: RecetaItem[];
  trabajos: TrabajoLink[];
  trabajoInsumos: TrabajoInsumo[];
  productos: ProductoLite[];
  tcBlue: number;
  ingenioNombre: (id: string) => string;
}): LoteMapCard[] {
  const {
    lotesIngenio,
    cpsCampo,
    trips,
    bajas,
    recetaLotes,
    recetaItems,
    trabajos,
    trabajoInsumos,
    productos,
    tcBlue,
    ingenioNombre,
  } = params;

  const bajasSet = new Set(bajas.map((b) => b.cp));
  const tripByRemito = new Map<number, MapaTrip>();
  for (const t of trips) if (t.remito != null) tripByRemito.set(t.remito, t);

  // Viajes reconciliados agrupados por lote de origen (cps_campo.lote).
  const tripsByLote = new Map<string, MapaTrip[]>();
  for (const c of cpsCampo) {
    if (c.lote == null || bajasSet.has(c.cp)) continue;
    const t = tripByRemito.get(c.cp);
    if (!t) continue;
    const arr = tripsByLote.get(c.lote);
    if (arr) arr.push(t);
    else tripsByLote.set(c.lote, [t]);
  }

  const productoNombre = new Map(productos.map((p) => [p.id, p.nombre]));
  const itemsByReceta = new Map<string, RecetaItem[]>();
  for (const it of recetaItems) {
    const arr = itemsByReceta.get(it.receta_id);
    if (arr) arr.push(it);
    else itemsByReceta.set(it.receta_id, [it]);
  }
  const insumosByTrabajo = new Map<string, TrabajoInsumo[]>();
  for (const ins of trabajoInsumos) {
    const arr = insumosByTrabajo.get(ins.trabajo_id);
    if (arr) arr.push(ins);
    else insumosByTrabajo.set(ins.trabajo_id, [ins]);
  }
  const toUsd = (ars: number) => (tcBlue > 0 ? ars / tcBlue : 0);

  const cards: LoteMapCard[] = lotesIngenio.map((meta) => {
    const loteTrips = tripsByLote.get(meta.lote_key) ?? [];
    const kgNeto = loteTrips.reduce((s, t) => s + (t.kg_neto || 0), 0);
    const surcosHa = meta.surcos_por_ha || SURCOS_POR_HA_DEFAULT;
    const surcos = meta.ha * surcosHa;
    const rdto = avgPresente(loteTrips.map((t) => t.rdto));

    // Ingenio derivado de los viajes (el más frecuente; en la práctica son todos el
    // mismo). null si el lote todavía no cosechó.
    let ingenioId: string | null = null;
    if (loteTrips.length > 0) {
      const cuenta = new Map<string, number>();
      for (const t of loteTrips)
        cuenta.set(t.ingenio_id, (cuenta.get(t.ingenio_id) ?? 0) + 1);
      ingenioId = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }

    // Aplicaciones: recetas/trabajos de los lotes FÍSICOS vinculados a este lote_key.
    const fisicos = new Set(LOTE_FISICO_POR_KEY[meta.lote_key] ?? []);
    const aplicaciones: Aplicacion[] = [];

    const recetaIds = new Set(
      recetaLotes.filter((rl) => rl.lote_id != null && fisicos.has(rl.lote_id)).map((rl) => rl.receta_id),
    );
    for (const recetaId of recetaIds) {
      for (const it of itemsByReceta.get(recetaId) ?? []) {
        const cant = it.cantidad ?? 0;
        const detalle =
          cant > 0
            ? `${cant} ${it.unidad ?? ""}`.trim()
            : it.dosis != null
              ? `${it.dosis} ${it.unidad ?? ""}/ha`.trim()
              : "—";
        aplicaciones.push({
          nombre: productoNombre.get(it.producto_id ?? "") ?? "—",
          detalle,
          usd: toUsd(it.total ?? 0),
        });
      }
    }
    for (const trabajo of trabajos) {
      if (trabajo.lote_id == null || !fisicos.has(trabajo.lote_id)) continue;
      for (const ins of insumosByTrabajo.get(trabajo.id) ?? []) {
        aplicaciones.push({
          nombre: ins.descripcion ?? "—",
          detalle: `${ins.cantidad ?? 0} ${ins.unidad ?? ""}`.trim(),
          usd: toUsd(ins.total ?? 0),
        });
      }
      if ((trabajo.costo_labor ?? 0) > 0) {
        aplicaciones.push({
          nombre: "Mano de obra",
          detalle: "labor",
          usd: toUsd(trabajo.costo_labor ?? 0),
        });
      }
    }

    const gastadoUsd = aplicaciones.reduce((s, a) => s + a.usd, 0);

    return {
      lote_key: meta.lote_key,
      nombre: meta.nombre,
      ha: meta.ha,
      surcos_por_ha: surcosHa,
      viajes: loteTrips.length,
      kg_neto_total: kgNeto,
      cosechado_tn: kgNeto / 1000,
      tn_surco: surcos > 0 ? kgNeto / 1000 / surcos : 0,
      parcial: loteTrips.length > 0, // sin noción de "lote cerrado" todavía → todos parciales
      rdto_promedio: rdto,
      ingenio_id: ingenioId,
      ingenio_nombre: ingenioId ? ingenioNombre(ingenioId) : null,
      color: colorPorRdto(rdto),
      aplicaciones,
      gastado_usd: gastadoUsd,
      usd_por_ha: meta.ha > 0 ? gastadoUsd / meta.ha : 0,
    };
  });

  // Orden: mayor a menor tn/surco (los sin cosecha, tn/surco 0, quedan al final).
  return cards.sort((a, b) => b.tn_surco - a.tn_surco);
}
