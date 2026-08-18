// Formato numérico consistente en toda la app — es-AR (separador de miles ".",
// decimal ","). Antes cada pantalla mezclaba `.toFixed(2)` (decimal con punto, ej.
// "9.72%") con `.toLocaleString("es-AR")` (miles con punto, decimal con coma) para
// números en la misma fila — usar estos helpers en vez de formatear a mano.

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatKg(n: number): string {
  return `${formatNumber(n, 0)} kg`;
}

export function formatTn(n: number, decimals = 1): string {
  return `${formatNumber(n, decimals)} tn`;
}

export function formatPercent(n: number, decimals = 2): string {
  return `${formatNumber(n, decimals)}%`;
}

export function formatMoney(n: number): string {
  return `$${formatNumber(n, 0)}`;
}

// [7118, 7166, 7167, 7168, 7200] → "7118, 7166–7168, 7200". Para listar remitos en
// un texto de alerta sin que 40 números tapen el mensaje. Corridas de 2 o más se
// colapsan a un rango; `maxGrupos` corta con "…" para que una lista patológica
// (muchos números sueltos) no vuelva la alerta ilegible.
export function compactarRangos(nums: number[], maxGrupos = 12): string {
  const ordenados = [...new Set(nums)].sort((a, b) => a - b);
  const grupos: string[] = [];
  for (let i = 0; i < ordenados.length; ) {
    let fin = i;
    while (fin + 1 < ordenados.length && ordenados[fin + 1] === ordenados[fin] + 1) fin++;
    grupos.push(fin === i ? `${ordenados[i]}` : `${ordenados[i]}–${ordenados[fin]}`);
    i = fin + 1;
  }
  if (grupos.length <= maxGrupos) return grupos.join(", ");
  return `${grupos.slice(0, maxGrupos).join(", ")} … (+${grupos.length - maxGrupos} más)`;
}

// "2026-08-06" → "08-06". Las tablas de viajes muestran solo mes-día (el año es
// siempre la zafra en curso). `null` = fecha todavía sin transcribir de la libreta
// (infraruts.fecha es nullable) — nunca romper el render por eso.
export function formatFechaCorta(fecha: string | null | undefined): string {
  return fecha ? fecha.slice(5) : "—";
}

// "2026-08-18" → "18/08/2026". Para listados que pueden abarcar más de una zafra
// (ventas, análisis de suelo), donde el año sí importa. Se parte el string en vez de
// `new Date(fecha)`: eso lo interpreta como UTC medianoche y en Argentina (UTC−3) tira
// la fecha un día para atrás. `null` → "—", igual que formatFechaCorta.
export function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : fecha;
}
