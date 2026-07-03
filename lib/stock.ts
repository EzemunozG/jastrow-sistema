// Espejo en TypeScript de la vista SQL stock_saldo (supabase/migrations/*_views.sql),
// portado de calcStock() en index_10.html:2875-2884. Se usa para el preview en el
// formulario de receta antes de guardar (sin round-trip a la base).
export type MovimientoStock = {
  tipo: "entrada" | "salida";
  cantidad: number;
  precio_unit: number;
};

export function calcStock(movimientos: MovimientoStock[]) {
  const entradas = movimientos
    .filter((m) => m.tipo === "entrada")
    .reduce((s, m) => s + m.cantidad, 0);
  const salidas = movimientos
    .filter((m) => m.tipo === "salida")
    .reduce((s, m) => s + m.cantidad, 0);
  const saldo = entradas - salidas;

  const movConPrecio = movimientos.filter(
    (m) => m.tipo === "entrada" && m.precio_unit > 0,
  );
  const totalVal = movConPrecio.reduce(
    (s, m) => s + m.cantidad * m.precio_unit,
    0,
  );
  const totalCant = movConPrecio.reduce((s, m) => s + m.cantidad, 0);
  const precioProm = totalCant > 0 ? totalVal / totalCant : 0;

  return { entradas, salidas, saldo, precio_prom: precioProm, valor_stock: saldo * precioProm };
}
