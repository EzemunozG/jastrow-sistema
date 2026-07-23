"use client";

import { useActionState, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { saveReceta } from "@/actions/recetas";
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
import { formatMoney as fmtMonto } from "@/lib/format";
import { RECETA_ACTION_IDLE, RECETA_TIPOS } from "@/lib/forms/recetas";

type Lote = Database["public"]["Tables"]["lotes"]["Row"];
type Producto = Database["public"]["Tables"]["productos"]["Row"];

type ItemRow = { producto_id: string; dosis: number };

const EMPTY_ITEM: ItemRow = { producto_id: "", dosis: 0 };

const selectNativeClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function RecetaFormDialog({
  lotes,
  productos,
  precioProm,
  open,
  onOpenChange,
}: {
  lotes: Lote[];
  productos: Producto[];
  precioProm: Map<string, number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    saveReceta,
    RECETA_ACTION_IDLE,
  );

  const { control, register, watch } = useForm<{ ha: string; items: ItemRow[] }>({
    defaultValues: { ha: "", items: [EMPTY_ITEM] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const ha = Number(watch("ha")) || 0;
  const items = watch("items");

  const productoById = new Map(productos.map((p) => [p.id, p]));
  let costoTotal = 0;
  const rows = items.map((it) => {
    const cantidad = (Number(it.dosis) || 0) * ha;
    const precio = precioProm.get(it.producto_id) ?? 0;
    const total = cantidad * precio;
    costoTotal += total;
    return { ...it, cantidad, precio, total, unidad: productoById.get(it.producto_id)?.unidad };
  });

  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva receta</DialogTitle>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input id="fecha" name="fecha" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loteId">Lote *</Label>
              <Select name="loteId">
                <SelectTrigger id="loteId" className="w-full">
                  <SelectValue placeholder="Seleccionar lote…" />
                </SelectTrigger>
                <SelectContent>
                  {lotes.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.id}
                      {l.nombre ? ` — ${l.nombre}` : ""} ({l.ha} ha)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ha">Hectáreas *</Label>
              <Input
                id="ha"
                type="number"
                step="0.1"
                required
                {...register("ha")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Select name="tipo" defaultValue={RECETA_TIPOS[0]}>
                <SelectTrigger id="tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECETA_TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa">Empresa / Operario</Label>
              <Input id="empresa" name="empresa" placeholder="Contratista o propio" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="obs">Observaciones</Label>
              <Input id="obs" name="obs" placeholder="Notas adicionales..." />
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Productos de la receta</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(EMPTY_ITEM)}
              >
                <IconPlus size={14} /> Producto
              </Button>
            </div>

            {fields.map((field, i) => {
              const row = rows[i];
              return (
                <div
                  key={field.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-end gap-2 rounded-lg bg-neutral-50 p-2"
                >
                  <select
                    className={selectNativeClass}
                    {...register(`items.${i}.producto_id`)}
                  >
                    <option value="">— Seleccionar —</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.unidad})
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="Dosis/ha"
                    {...register(`items.${i}.dosis`)}
                  />
                  <Input
                    readOnly
                    value={row ? row.cantidad.toFixed(2) : ""}
                    placeholder={`Total (${row?.unidad ?? "u"})`}
                    className="bg-neutral-100"
                  />
                  <div className="px-2 text-sm font-medium text-emerald-700">
                    {row && row.total > 0 ? fmtMonto(row.total) : "—"}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(i)}
                    disabled={fields.length === 1}
                  >
                    <IconTrash size={14} />
                  </Button>
                </div>
              );
            })}

            <div className="flex justify-end gap-4 text-sm">
              <div>
                Costo total:{" "}
                <strong className="text-emerald-700">{fmtMonto(costoTotal)}</strong>
              </div>
              {ha > 0 && (
                <div>
                  Costo/ha:{" "}
                  <strong className="text-emerald-700">
                    {fmtMonto(costoTotal / ha)}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {state.status === "error" && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar receta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
