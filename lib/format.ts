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

// "2026-08-06" → "08-06". Las tablas de viajes muestran solo mes-día (el año es
// siempre la zafra en curso). `null` = fecha todavía sin transcribir de la libreta
// (infraruts.fecha es nullable) — nunca romper el render por eso.
export function formatFechaCorta(fecha: string | null | undefined): string {
  return fecha ? fecha.slice(5) : "—";
}
