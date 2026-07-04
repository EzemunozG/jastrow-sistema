"use client";

import { useActionState, useEffect } from "react";
import { addEntradaStock } from "@/actions/stock";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/lib/database.types";
import {
  ENTRADA_STOCK_ACTION_IDLE,
  STOCK_CATEGORIAS,
  STOCK_UNIDADES,
} from "@/lib/forms/stock";

type Producto = Database["public"]["Tables"]["productos"]["Row"];
type Factura = Database["public"]["Tables"]["facturas"]["Row"];

export function EntradaStockDialog({
  producto,
  facturas,
  open,
  onOpenChange,
}: {
  producto?: Producto | null;
  facturas: Factura[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    addEntradaStock,
    ENTRADA_STOCK_ACTION_IDLE,
  );

  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar entrada de stock</DialogTitle>
        </DialogHeader>

        <form action={action} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="nombre">Producto *</Label>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={producto?.nombre ?? ""}
              placeholder="Nombre del producto"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoria">Categoría</Label>
            <Select
              name="categoria"
              defaultValue={producto?.categoria ?? STOCK_CATEGORIAS[0]}
            >
              <SelectTrigger id="categoria" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unidad">Unidad</Label>
            <Select name="unidad" defaultValue={producto?.unidad ?? STOCK_UNIDADES[0]}>
              <SelectTrigger id="unidad" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_UNIDADES.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cantidad">Cantidad *</Label>
            <Input
              id="cantidad"
              name="cantidad"
              type="number"
              step="0.01"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="precio">Precio unit. ($)</Label>
            <Input id="precio" name="precio" type="number" step="0.01" placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha *</Label>
            <Input id="fecha" name="fecha" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="facturaId">Factura vinculada</Label>
            <Select name="facturaId">
              <SelectTrigger id="facturaId" className="w-full">
                <SelectValue placeholder="Sin vincular" />
              </SelectTrigger>
              <SelectContent>
                {facturas.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.numero} — {f.proveedor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="obs">Observaciones</Label>
            <Input id="obs" name="obs" placeholder="Notas adicionales..." />
          </div>

          {state.status === "error" && (
            <p className="col-span-2 text-sm text-red-600">{state.error}</p>
          )}

          <DialogFooter className="col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Registrar entrada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
