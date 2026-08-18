// "Mapa de lotes" — una tarjeta por lote con su tn/surco de número protagonista y el
// color por rdto% vs meta. Toda la lógica derivada vive acá (funciones puras), la
// page.tsx solo fetchea y llama a computeMapaLotes(). Ver app/(app)/mapa/page.tsx.
//
// Atribución de viajes a lote: idéntica a lib/alerts.ts / lib/reconciliation.ts —
// cps_campo.lote es el lote de origen del despacho, y se cruza con el INFRARUT por
// REMITO (nunca por carta de porte). Los remitos dados de baja (ARCA) se excluyen.

import { META } from "./business-rules";
import type { Alert } from "./alerts";
import { contornoAproximado } from "./lote-geo";
import { ESTADO_PLANIFICADO } from "./suelo";

// ── Umbrales de COLOR de la tarjeta: por rdto% promedio vs meta (10%). El rdto es
// comparable aunque el lote esté a medio cosechar, a diferencia del tn/surco (que
// castigaría a un lote que recién arrancó). Meta = business-rules.META (10). El corte
// de amarillo (9) es propio de esta pantalla y NO es UMBRALES.rdtoWarn (9,5): son
// cosas distintas, no mezclar (decisión del usuario, 2026-07-30).
export const RDTO_AMARILLO = 9;

export const SURCOS_POR_HA_DEFAULT = 61; // fallback si lotes_ingenio.surcos_por_ha viniera null

// ¿El kg/surco de este lote es una estimación? Sí en dos casos: cuando no hay dato
// (null → se usa el default) y cuando el dato ES el default.
//
// Lo segundo parece raro pero es lo correcto hoy: las 12 filas de `lotes_ingenio`
// tienen 61 cargado, todas el mismo número y justo el default del código — es un
// placeholder que se sembró parejo, no una medición lote por lote (confirmado por el
// usuario, 2026-08-13). Mientras siga así, ningún kg/surco es un dato duro.
//
// Efecto colateral asumido: un lote que de verdad mida 61 surcos/ha va a quedar
// marcado como estimado igual. Cuando se carguen los surcos reales, esta función pasa
// a ser `surcos == null` a secas (o se lleva la marca a una columna de la tabla, del
// tipo `surcos_por_ha_medido`).
export function surcosEstimados(surcosPorHa: number | null | undefined): boolean {
  return !surcosPorHa || surcosPorHa === SURCOS_POR_HA_DEFAULT;
}

// ── Rinde esperado (tn/ha) para la barra de avance de cosecha: avance = tn cosechadas
// ÷ (ha × rinde), cap 100%. Cada lote puede sobreescribirlo (lotes_ingenio.
// rinde_esperado_tn_ha); el default global vive en app_settings; esto es el fallback si
// la migración 20260730000001 todavía no se aplicó.
export const RINDE_ESPERADO_DEFAULT = 70;

// ── Mapeo lote_key (libreta / lotes_ingenio) → lote(s) FÍSICO(s) (tabla `lotes`, ids
// L4-* / VA-*), para poder traer las aplicaciones (recetas/trabajos) de cada lote. La
// tabla `lotes` (Campo) y `lotes_ingenio` (cosecha) se armaron por separado y no
// comparten id ni nombre, así que este vínculo hay que declararlo a mano. PROVISORIO —
// Ezequiel confirma/corrige los que faltan (los `[]` son "no sé todavía"). Editar acá.
// Mapeo definitivo confirmado por el usuario (2026-07-30). Las diferencias de hectáreas
// entre el lote de cosecha (lotes_ingenio.ha) y el físico (lotes.ha) son conocidas y
// aceptadas — el prorrateo por ha del gasto (ver computeMapaLotes) las absorbe. Cada
// físico en un solo lote_key (el guard dupsLoteFisico lo verifica).
export const LOTE_FISICO_POR_KEY: Record<string, string[]> = {
  "LAS 101": ["L4-100"], // receta llama "Lote 100" al L4-100; lote_ingenio "Lote 101"
  LUCHO: ["L4-LUCHO"],
  "TALA POSO 2": ["L4-TP2"],
  "TALA POSO 3": ["L4-TP3"],
  PILOT: ["L4-PILOT"],
  FRAU: ["VA-07"], // REC-004 "Lote Frau" → VA-07; VA-07 dueño = Néstor Frau
  "CASA FRAU": ["VA-08"], // VA-08 también dueño Néstor Frau
  TANO: ["VA-05"],
  PACO: ["VA-09"], // "JASTROW - LOTE 3" en el INFRARUT
  PAQUITO: ["VA-10"],
  "TALA POSO 1": [], // no existe físico todavía → tarjeta con empty state
  GELY: ["GELY"], // arrendado, 16 ha; contorno aproximado en lib/lote-geo.ts
};

// Detecta un lote FÍSICO asignado a más de un lote_key. Eso sería un bug: el costo de
// las recetas/trabajos de ese lote físico se contaría en cada lote_key (double-count
// del "Gastado" y aplicaciones repetidas). computeMapaLotes() llama a esto y falla
// ruidosamente en dev / loguea en prod para que no pase en silencio (ver el test en
// lib/lot-map.test.ts). Devuelve [] si el mapeo está sano.
export function dupsLoteFisico(
  map: Record<string, string[]> = LOTE_FISICO_POR_KEY,
): { fisico: string; keys: string[] }[] {
  const usos = new Map<string, string[]>();
  for (const [key, fisicos] of Object.entries(map)) {
    for (const f of fisicos) {
      const arr = usos.get(f);
      if (arr) arr.push(key);
      else usos.set(f, [key]);
    }
  }
  return [...usos.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([fisico, keys]) => ({ fisico, keys }));
}

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
  usd: number; // ya prorrateado si la receta es compartida
  compartida: boolean; // la receta abarca >1 lote físico (costo repartido por ha)
};

export type ColorLote = "verde" | "amarillo" | "rojo" | "sin-cosecha";

export type LoteMapCard = {
  lote_key: string;
  nombre: string;
  ha: number;
  surcos_por_ha: number;
  viajes: number; // despachos de la libreta YA pesados por el ingenio
  // Despachos anotados en la libreta que el ingenio todavía no pesó (no hay INFRARUT
  // con ese remito). Sus toneladas no están en kg_neto_total todavía: el tn/ha de la
  // tarjeta es "lo confirmado hasta ahora", no el total que va a terminar dando.
  viajes_sin_pesaje: number;
  kg_neto_total: number;
  cosechado_tn: number;
  tn_surco: number;
  tn_ha: number;
  // Rinde por surco: los mismos kg conciliados que el tn/ha, sobre los surcos del lote
  // (ha × surcos_por_ha). Es tn_surco × 1000, pero en kg se lee mejor en la tarjeta —
  // los valores reales andan por los 700–1.100 kg.
  kg_surco: number;
  // true = los surcos/ha de este lote NO son un dato medido, así que el kg/surco es
  // una estimación y la tarjeta lo marca con asterisco. Ver surcosEstimados().
  surcos_estimados: boolean;
  avance_pct: number | null; // % de cosecha vs. tn esperadas; null si no cosechó
  rdto_promedio: number | null;
  ingenio_id: string | null; // derivado de los viajes, NO hardcodeado
  ingenio_nombre: string | null;
  color: ColorLote;
  aplicaciones: Aplicacion[];
  gastado_usd: number;
  usd_por_ha: number;
  alertas: Alert[]; // alertas de ESTE lote (severidad bad/warn/info)
  alerta_severidad: "bad" | "warn" | null; // para el punto de la tarjeta
  // El lote no está declarado en `lotes_ingenio`: apareció solo porque la libreta
  // tiene despachos con ese lote. Metadata (nombre/ha) sacada de la tabla `lotes`.
  solo_libreta: boolean;
  // Nota de contorno aproximado (lib/lote-geo.ts), o null si tiene perímetro real /
  // no tenemos coordenadas.
  contorno_nota: string | null;
  // El lote tiene al menos una línea de plan_fertilizacion en estado 'planificado' →
  // la tarjeta muestra el chip "Fert. pendiente" que linkea a /suelos.
  fert_pendiente: boolean;
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
    rinde_esperado_tn_ha?: number | null; // override por lote; null = usa el default
  }[];
  cpsCampo: MapaCpCampo[];
  trips: MapaTrip[];
  bajas: MapaBaja[];
  recetaLotes: RecetaLoteLink[];
  recetaItems: RecetaItem[];
  trabajos: TrabajoLink[];
  trabajoInsumos: TrabajoInsumo[];
  productos: ProductoLite[];
  // Tabla `lotes` (los lotes físicos del campo): `ha` para prorratear el gasto de las
  // recetas compartidas, `nombre` para poder mostrar el nombre real de un lote que
  // todavía no está declarado en `lotes_ingenio`.
  lotesFisicos: { id: string; ha: number; nombre: string | null }[];
  // Plan de fertilización (lib/suelo.ts): solo se usa para marcar qué lotes tienen algo
  // pendiente. El detalle vive en /suelos.
  planesFertilizacion?: { lote_key: string | null; estado: string }[];
  tcBlue: number;
  rindeEsperadoDefault: number; // tn/ha esperadas (global, de app_settings)
  alertasPorLote: Record<string, Alert[]>; // alertas ya computadas, por lote_key
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
    lotesFisicos,
    planesFertilizacion = [],
    tcBlue,
    rindeEsperadoDefault,
    alertasPorLote,
    ingenioNombre,
  } = params;

  // Guard: un lote físico en más de un lote_key duplicaría sus aplicaciones/gasto.
  // En dev revienta (imposible no verlo); en prod loguea y sigue (no tira abajo el
  // home por un error de mapeo). El test lib/lot-map.test.ts lo cubre formalmente.
  const dups = dupsLoteFisico();
  if (dups.length > 0) {
    const msg =
      "LOTE_FISICO_POR_KEY: lote(s) físico(s) en más de un lote_key (double-count de aplicaciones): " +
      dups.map((d) => `${d.fisico} → [${d.keys.join(", ")}]`).join("; ");
    if (process.env.NODE_ENV !== "production") throw new Error(msg);
    console.error(msg);
  }

  const fertPendientePorLote = new Set(
    planesFertilizacion
      .filter((p) => p.lote_key != null && p.estado === ESTADO_PLANIFICADO)
      .map((p) => p.lote_key as string),
  );

  const bajasSet = new Set(bajas.map((b) => b.cp));
  const tripByRemito = new Map<number, MapaTrip>();
  for (const t of trips) if (t.remito != null) tripByRemito.set(t.remito, t);

  // Despachos de la libreta agrupados por lote de origen (cps_campo.lote), separando
  // los que el ingenio ya pesó (hay INFRARUT con ese remito) de los que todavía no.
  // Los pendientes no suman kilos — no existen todavía como número — pero se cuentan
  // aparte para que la tarjeta pueda decir "y además hay N viajes sin pesar".
  const despachosPorLote = new Map<string, { pesados: MapaTrip[]; sinPesaje: number }>();
  for (const c of cpsCampo) {
    if (c.lote == null || bajasSet.has(c.cp)) continue;
    let g = despachosPorLote.get(c.lote);
    if (!g) {
      g = { pesados: [], sinPesaje: 0 };
      despachosPorLote.set(c.lote, g);
    }
    const t = tripByRemito.get(c.cp);
    if (t) g.pesados.push(t);
    else g.sinPesaje++;
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

  // Para el prorrateo de recetas compartidas: ha de cada lote físico, y los lotes
  // físicos que abarca cada receta (una receta puede estar cargada sobre varios).
  const haFisico = new Map(lotesFisicos.map((l) => [l.id, l.ha]));
  const fisicosDeReceta = new Map<string, string[]>();
  for (const rl of recetaLotes) {
    if (rl.lote_id == null) continue;
    const arr = fisicosDeReceta.get(rl.receta_id);
    if (arr) arr.push(rl.lote_id);
    else fisicosDeReceta.set(rl.receta_id, [rl.lote_id]);
  }
  const haTotalReceta = (recetaId: string) =>
    (fisicosDeReceta.get(recetaId) ?? []).reduce(
      (s, id) => s + (haFisico.get(id) ?? 0),
      0,
    );

  // Lotes a mostrar = los declarados en `lotes_ingenio` MÁS los que aparecen en la
  // libreta y nadie declaró. Antes la grilla salía solo de `lotes_ingenio`, así que un
  // lote nuevo (GELY: existe en `lotes`, ya despachó 28 viajes) no aparecía hasta que
  // alguien le creara la fila de cosecha a mano. Ahora entra solo, con nombre y ha
  // tomados de la tabla `lotes` a través de LOTE_FISICO_POR_KEY.
  const nombreFisico = new Map(lotesFisicos.map((l) => [l.id, l.nombre]));
  const declaradas = new Set(lotesIngenio.map((l) => l.lote_key));
  const soloLibreta = [...despachosPorLote.keys()]
    .filter((k) => !declaradas.has(k))
    .sort();
  const metas = [
    ...lotesIngenio.map((l) => ({ ...l, solo_libreta: false })),
    ...soloLibreta.map((lote_key) => {
      const fisicos = LOTE_FISICO_POR_KEY[lote_key] ?? [];
      return {
        lote_key,
        nombre:
          fisicos.map((id) => nombreFisico.get(id)).find((n) => n) ?? lote_key,
        ha: fisicos.reduce((s, id) => s + (haFisico.get(id) ?? 0), 0),
        surcos_por_ha: null as number | null,
        rinde_esperado_tn_ha: null as number | null,
        solo_libreta: true,
      };
    }),
  ];

  const cards: LoteMapCard[] = metas.map((meta) => {
    const despachos = despachosPorLote.get(meta.lote_key) ?? {
      pesados: [],
      sinPesaje: 0,
    };
    const loteTrips = despachos.pesados;
    const kgNeto = loteTrips.reduce((s, t) => s + (t.kg_neto || 0), 0);
    const cosechadoTn = kgNeto / 1000;
    const surcosHa = meta.surcos_por_ha || SURCOS_POR_HA_DEFAULT;
    const surcos = meta.ha * surcosHa;
    const rdto = avgPresente(loteTrips.map((t) => t.rdto));

    // Avance de cosecha = tn cosechadas ÷ tn esperadas (ha × rinde), cap 100%. null si
    // el lote todavía no cosechó (la tarjeta no muestra barra en ese caso).
    const rinde = meta.rinde_esperado_tn_ha ?? rindeEsperadoDefault;
    const tnEsperadas = meta.ha * rinde;
    const avancePct =
      loteTrips.length > 0 && tnEsperadas > 0
        ? Math.min(100, (cosechadoTn / tnEsperadas) * 100)
        : null;

    // Alertas de este lote (ya computadas una vez en la page) + severidad para el punto.
    const alertas = alertasPorLote[meta.lote_key] ?? [];
    const alertaSeveridad: "bad" | "warn" | null = alertas.some(
      (a) => a.severity === "bad",
    )
      ? "bad"
      : alertas.some((a) => a.severity === "warn")
        ? "warn"
        : null;

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
      recetaLotes
        .filter((rl) => rl.lote_id != null && fisicos.has(rl.lote_id))
        .map((rl) => rl.receta_id),
    );
    for (const recetaId of recetaIds) {
      const fisicosReceta = fisicosDeReceta.get(recetaId) ?? [];
      const compartida = fisicosReceta.length > 1;
      // Prorrateo: de la receta, la parte que le toca a ESTE lote = ha de los físicos
      // de este lote_key sobre la ha total de todos los físicos de la receta. Si
      // ninguna ha está cargada, se reparte por cantidad de físicos (no dividir por 0).
      const enEsteLote = fisicosReceta.filter((id) => fisicos.has(id));
      const haTot = haTotalReceta(recetaId);
      const cardHa = enEsteLote.reduce((s, id) => s + (haFisico.get(id) ?? 0), 0);
      const factor =
        haTot > 0
          ? cardHa / haTot
          : fisicosReceta.length > 0
            ? enEsteLote.length / fisicosReceta.length
            : 1;
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
          usd: toUsd(it.total ?? 0) * factor,
          compartida,
        });
      }
    }
    // Trabajos: siempre sobre un único lote físico (lote_id), nunca compartidos.
    for (const trabajo of trabajos) {
      if (trabajo.lote_id == null || !fisicos.has(trabajo.lote_id)) continue;
      for (const ins of insumosByTrabajo.get(trabajo.id) ?? []) {
        aplicaciones.push({
          nombre: ins.descripcion ?? "—",
          detalle: `${ins.cantidad ?? 0} ${ins.unidad ?? ""}`.trim(),
          usd: toUsd(ins.total ?? 0),
          compartida: false,
        });
      }
      if ((trabajo.costo_labor ?? 0) > 0) {
        aplicaciones.push({
          nombre: "Mano de obra",
          detalle: "labor",
          usd: toUsd(trabajo.costo_labor ?? 0),
          compartida: false,
        });
      }
    }

    const gastadoUsd = aplicaciones.reduce((s, a) => s + a.usd, 0);

    // Contorno aproximado: se busca por los lotes FÍSICOS de este lote_key (la clave de
    // lote-geo.ts es `lotes.id`), no por lote_key.
    const contornoNota =
      (LOTE_FISICO_POR_KEY[meta.lote_key] ?? [])
        .map((id) => contornoAproximado(id))
        .find((c) => c != null)?.nota ?? null;

    return {
      lote_key: meta.lote_key,
      nombre: meta.nombre,
      ha: meta.ha,
      surcos_por_ha: surcosHa,
      viajes: loteTrips.length,
      viajes_sin_pesaje: despachos.sinPesaje,
      kg_neto_total: kgNeto,
      cosechado_tn: cosechadoTn,
      tn_surco: surcos > 0 ? kgNeto / 1000 / surcos : 0,
      tn_ha: meta.ha > 0 ? kgNeto / 1000 / meta.ha : 0,
      kg_surco: surcos > 0 ? kgNeto / surcos : 0,
      surcos_estimados: surcosEstimados(meta.surcos_por_ha),
      avance_pct: avancePct,
      rdto_promedio: rdto,
      ingenio_id: ingenioId,
      ingenio_nombre: ingenioId ? ingenioNombre(ingenioId) : null,
      color: colorPorRdto(rdto),
      aplicaciones,
      gastado_usd: gastadoUsd,
      usd_por_ha: meta.ha > 0 ? gastadoUsd / meta.ha : 0,
      alertas,
      alerta_severidad: alertaSeveridad,
      solo_libreta: meta.solo_libreta,
      contorno_nota: contornoNota,
      fert_pendiente: fertPendientePorLote.has(meta.lote_key),
    };
  });

  // Orden: mayor a menor tn/surco (los sin cosecha, tn/surco 0, quedan al final).
  return cards.sort((a, b) => b.tn_surco - a.tn_surco);
}

// ── Agregado de toda la empresa (los dos ingenios juntos: la métrica es la misma y el
// campo es uno solo).
export type GeneralCampo = {
  lotes_computados: number; // lotes que entran en el cálculo
  lotes_totales: number; // lotes del sistema, computados o no
  ha: number;
  surcos: number;
  kg_neto_total: number;
  cosechado_tn: number;
  tn_ha: number;
  kg_surco: number;
  surcos_estimados: boolean; // algún lote computado usa surcos/ha de referencia
};

// Promedio ponderado real (kilos totales ÷ superficie total), NO el promedio de los
// tn/ha de cada lote — eso le daría el mismo peso a un lote de 16 ha que a uno de 101.
//
// Solo entran los lotes con al menos un viaje ya conciliado y pesado. Un lote sin
// cosechar (o con la cosecha todavía sin pesar) sumaría sus hectáreas al denominador
// aportando cero kilos, y en plena zafra eso hunde el número: hoy los 4 lotes sin
// cosecha son 260 ha de las 625 del sistema, así que incluirlos daría ~21 tn/ha en vez
// de ~36. Ojo con el borde de este criterio: un lote que ARRANCÓ la cosecha entra con
// TODAS sus hectáreas aunque lleve dos viajes, así que sigue tirando el promedio para
// abajo mientras avanza (GELY, hoy: 16 ha por 38 tn).
export function computeGeneralCampo(cards: LoteMapCard[]): GeneralCampo | null {
  const computados = cards.filter((c) => c.viajes > 0);
  if (computados.length === 0) return null;

  const kg = computados.reduce((s, c) => s + c.kg_neto_total, 0);
  const ha = computados.reduce((s, c) => s + c.ha, 0);
  const surcos = computados.reduce((s, c) => s + c.ha * c.surcos_por_ha, 0);

  return {
    lotes_computados: computados.length,
    lotes_totales: cards.length,
    ha,
    surcos,
    kg_neto_total: kg,
    cosechado_tn: kg / 1000,
    tn_ha: ha > 0 ? kg / 1000 / ha : 0,
    kg_surco: surcos > 0 ? kg / surcos : 0,
    surcos_estimados: computados.some((c) => c.surcos_estimados),
  };
}
