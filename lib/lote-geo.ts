// Contornos APROXIMADOS de lotes: un cuadrado de la superficie declarada, centrado en
// la coordenada que tenemos. Sirve para ubicar el lote en el terreno mientras no haya
// un relevamiento real del perímetro.
//
// Por qué vive acá y no en la tabla `lotes`: `lotes.lat`/`lon` guardan UN punto (el
// centro), no un polígono, y hoy solo los VA-* lo tienen cargado. Este módulo es el
// lugar de paso: cuando llegue el contorno real de un lote, se borra su entrada de
// CENTROS_APROXIMADOS y se lee de donde venga el polígono verdadero — el resto del
// código consume contornoAproximado() y no se entera.
//
// OJO: hoy la app NO dibuja mapas. /mapa es una grilla de tarjetas (ver
// components/mapa/lote-map-grid.tsx), así que estos puntos todavía no se renderizan;
// se usa la superficie y la marca de "aproximado" para avisarlo en la tarjeta. Los
// puntos quedan listos para el día que se agregue un mapa de verdad.

export type Punto = { lat: number; lon: number };

export type ContornoLote = {
  lote_id: string;
  centro: Punto;
  ha: number;
  // Anillo cerrado (el último punto repite el primero), en sentido horario desde el
  // vértice noroeste. Formato pensado para pasarlo tal cual a un GeoJSON/Leaflet.
  puntos: Punto[];
  aproximado: boolean;
  nota: string;
};

// Grados → metros. Constantes del elipsoide WGS-84 a la latitud de Tucumán; alcanza de
// sobra para un cuadrado de 400 m (el error es de centímetros).
const METROS_POR_GRADO_LAT = 110540;
const METROS_POR_GRADO_LON_ECUADOR = 111320;

export function metrosPorGradoLon(lat: number): number {
  return METROS_POR_GRADO_LON_ECUADOR * Math.cos((lat * Math.PI) / 180);
}

// Cuadrado de `ha` hectáreas centrado en `centro`. 16 ha = 160.000 m² → lado de 400 m.
export function cuadradoAproximado(centro: Punto, ha: number): Punto[] {
  const lado = Math.sqrt(ha * 10000); // m
  const dLat = lado / 2 / METROS_POR_GRADO_LAT;
  const dLon = lado / 2 / metrosPorGradoLon(centro.lat);
  const norte = centro.lat + dLat;
  const sur = centro.lat - dLat;
  const oeste = centro.lon - dLon;
  const este = centro.lon + dLon;
  return [
    { lat: norte, lon: oeste },
    { lat: norte, lon: este },
    { lat: sur, lon: este },
    { lat: sur, lon: oeste },
    { lat: norte, lon: oeste }, // cierra el anillo
  ];
}

// Superficie de un anillo lat/lon en hectáreas (fórmula del área de un polígono plano,
// proyectando a metros). Solo para verificar que un contorno aproximado da la ha que
// declara — no para medir parcelas reales.
export function hectareasDe(puntos: Punto[]): number {
  if (puntos.length < 4) return 0;
  const latRef = puntos.reduce((s, p) => s + p.lat, 0) / puntos.length;
  const mLon = metrosPorGradoLon(latRef);
  const xy = puntos.map((p) => ({
    x: p.lon * mLon,
    y: p.lat * METROS_POR_GRADO_LAT,
  }));
  let area2 = 0;
  for (let i = 0; i < xy.length - 1; i++) {
    area2 += xy[i].x * xy[i + 1].y - xy[i + 1].x * xy[i].y;
  }
  return Math.abs(area2 / 2) / 10000;
}

// Lotes cuyo perímetro todavía no se relevó: se dibuja un cuadrado de su superficie
// alrededor del centro. Key = `lotes.id`. Al conseguir el contorno real de un lote,
// sacarlo de acá.
export const CENTROS_APROXIMADOS: Record<string, { centro: Punto; ha: number }> = {
  // Coordenadas pasadas por el usuario el 2026-08-11. En la tabla `lotes`, GELY tiene
  // lat/lon en null; cuando se carguen ahí, esta entrada puede leer de la base.
  GELY: { centro: { lat: -26.743168, lon: -64.823662 }, ha: 16 },
};

export function contornoAproximado(loteId: string): ContornoLote | null {
  const def = CENTROS_APROXIMADOS[loteId];
  if (!def) return null;
  const lado = Math.round(Math.sqrt(def.ha * 10000));
  return {
    lote_id: loteId,
    centro: def.centro,
    ha: def.ha,
    puntos: cuadradoAproximado(def.centro, def.ha),
    aproximado: true,
    nota: `Contorno aproximado: cuadrado de ${lado} × ${lado} m (${def.ha} ha) centrado en la coordenada del lote. Reemplazar cuando haya perímetro relevado.`,
  };
}
