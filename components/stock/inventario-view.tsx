"use client";

import { useMemo, useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { useCanWrite } from "@/components/providers/role-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/lib/database.types";
import { formatMoney as fmtMonto } from "@/lib/format";
import { calcStock } from "@/lib/stock";
import { EntradaStockDialog } from "./entrada-stock-dialog";

type Producto = Database["public"]["Tables"]["productos"]["Row"];
type Movimiento = Database["public"]["Tables"]["movimientos_stock"]["Row"];
type Factura = Database["public"]["Tables"]["facturas"]["Row"];

const CAT_COLOR: Record<string, string> = {
  Herbicida: "text-red-700 dark:text-red-300",
  Fertilizante: "text-emerald-700 dark:text-emerald-300",
  Bioestimulante: "text-blue-700 dark:text-blue-300",
  Insecticida: "text-purple-700",
  Fungicida: "text-amber-800 dark:text-amber-300",
  Madurante: "text-emerald-800 dark:text-emerald-300",
  Otro: "text-muted-foreground",
};

export function InventarioView({
  productos,
  movimientos,
  facturas,
}: {
  productos: Producto[];
  movimientos: Movimiento[];
  facturas: Factura[];
}) {
  const canWrite = useCanWrite();
  const [selected, setSelected] = useState<Producto | null>(null);
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  function openNew() {
    setSelected(null);
    setDialogKey((k) => k + 1);
    setOpen(true);
  }

  function openEntradaFor(p: Producto) {
    setSelected(p);
    setDialogKey((k) => k + 1);
    setOpen(true);
  }

  const movsByProducto = useMemo(() => {
    const map = new Map<string, Movimiento[]>();
    for (const m of movimientos) {
      const arr = map.get(m.producto_id) ?? [];
      arr.push(m);
      map.set(m.producto_id, arr);
    }
    return map;
  }, [movimientos]);

  const stats = useMemo(
    () =>
      productos.map((p) => ({
        producto: p,
        ...calcStock(movsByProducto.get(p.id) ?? []),
      })),
    [productos, movsByProducto],
  );

  const totalValor = stats.reduce((s, x) => s + x.valor_stock, 0);
  const sinPrecio = stats.filter(
    (x) => x.precio_prom === 0 && x.entradas > 0,
  ).length;

  const movimientosOrdenados = useMemo(() => {
    const rows = movimientos.map((m) => {
      const producto = productos.find((p) => p.id === m.producto_id);
      const sorted = (movsByProducto.get(m.producto_id) ?? [])
        .slice()
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      let saldo = 0;
      for (const mv of sorted) {
        saldo += mv.tipo === "entrada" ? mv.cantidad : -mv.cantidad;
        if (mv.id === m.id) break;
      }
      return { ...m, prodNombre: producto?.nombre ?? "—", unidad: producto?.unidad ?? "", saldoCalc: saldo };
    });
    return rows.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [movimientos, movsByProducto, productos]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[130px] flex-1 rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">Productos</div>
          <div className="text-lg font-semibold">{productos.length}</div>
          <div className="text-xs text-muted-foreground">en inventario</div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">Valor stock</div>
          <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            {fmtMonto(totalValor)}
          </div>
          <div className="text-xs text-muted-foreground">al precio de compra</div>
        </div>
        {sinPrecio > 0 && (
          <div className="min-w-[130px] flex-1 rounded-xl border bg-card p-3">
            <div className="text-xs text-muted-foreground">Sin precio</div>
            <div className="text-lg font-semibold text-amber-700 dark:text-amber-300">
              {sinPrecio}
            </div>
            <div className="text-xs text-muted-foreground">pendiente de factura</div>
          </div>
        )}
      </div>

      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openNew}>
            <IconPlus size={14} /> Nueva entrada
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Entradas</TableHead>
              <TableHead>Salidas</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Precio prom.</TableHead>
              <TableHead>Valor stock</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((s) => (
              <TableRow key={s.producto.id}>
                <TableCell className="font-medium">{s.producto.nombre}</TableCell>
                <TableCell>
                  <span className={`text-xs font-medium ${CAT_COLOR[s.producto.categoria ?? "Otro"] ?? ""}`}>
                    {s.producto.categoria ?? "—"}
                  </span>
                </TableCell>
                <TableCell>{s.producto.unidad}</TableCell>
                <TableCell>
                  {s.entradas.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  {s.salidas.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      s.saldo < 0
                        ? "border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300"
                        : s.saldo === 0
                          ? "border-border bg-muted text-muted-foreground"
                          : "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    }
                  >
                    {s.saldo.toLocaleString("es-AR", { maximumFractionDigits: 2 })}{" "}
                    {s.producto.unidad}
                  </Badge>
                </TableCell>
                <TableCell>
                  {s.precio_prom > 0 ? (
                    fmtMonto(s.precio_prom)
                  ) : (
                    <span className="text-xs text-amber-700 dark:text-amber-300">⚠ Sin precio</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {s.valor_stock > 0 ? fmtMonto(s.valor_stock) : "—"}
                </TableCell>
                <TableCell>
                  {canWrite && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEntradaFor(s.producto)}
                    >
                      + Entrada
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {stats.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Sin productos cargados todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Precio unit.</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientosOrdenados.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.fecha}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      m.tipo === "entrada"
                        ? "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300"
                    }
                  >
                    {m.tipo === "entrada" ? "↓ Entrada" : "↑ Salida"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{m.prodNombre}</TableCell>
                <TableCell>
                  {m.tipo === "entrada" ? "+" : "−"}
                  {m.cantidad.toLocaleString("es-AR", { maximumFractionDigits: 2 })}{" "}
                  {m.unidad}
                </TableCell>
                <TableCell>
                  {m.precio_unit > 0 ? fmtMonto(m.precio_unit) : "—"}
                </TableCell>
                <TableCell>
                  {(m.total ?? 0) > 0 ? fmtMonto(m.total ?? 0) : "—"}
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                  {m.origen ?? "—"}
                </TableCell>
                <TableCell>
                  {m.saldoCalc.toLocaleString("es-AR", { maximumFractionDigits: 2 })}{" "}
                  {m.unidad}
                </TableCell>
              </TableRow>
            ))}
            {movimientosOrdenados.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Sin movimientos registrados todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EntradaStockDialog
        key={dialogKey}
        producto={selected}
        facturas={facturas}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
