"use client";

import { useActionState, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { saveTrabajo } from "@/actions/trabajos";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/lib/database.types";
import {
  TRABAJO_ACTION_IDLE,
  TRABAJO_TIPOS_GRUPOS,
  TRABAJO_UNIDADES,
} from "@/lib/forms/trabajos";

type Lote = Database["public"]["Tables"]["lotes"]["Row"];
type Factura = Database["public"]["Tables"]["facturas"]["Row"];

type InsumoRow = {
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio_unit: number;
  factura_id: string;
};

const EMPTY_INSUMO: InsumoRow = {
  descripcion: "",
  cantidad: 1,
  unidad: "kg",
  precio_unit: 0,
  factura_id: "",
};

const selectNativeClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TrabajoFormDialog({
  lote,
  facturas,
  open,
  onOpenChange,
}: {
  lote: Lote;
  facturas: Factura[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    saveTrabajo,
    TRABAJO_ACTION_IDLE,
  );

  const { control, register, watch } = useForm<{ insumos: InsumoRow[] }>({
    defaultValues: { insumos: [] },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "insumos",
  });
  const insumos = watch("insumos");
  const totalInsumos = insumos.reduce(
    (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unit) || 0),
    0,
  );

  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar trabajo</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-xs text-neutral-500">
          Lote: {lote.id}
          {lote.nombre ? ` — ${lote.nombre}` : ""} · {lote.ha} ha
        </p>

        <form action={action} className="space-y-4">
          <input type="hidden" name="lote_id" value={lote.id} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input id="fecha" name="fecha" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo de trabajo *</Label>
              <Select name="tipo">
                <SelectTrigger id="tipo" className="w-full">
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent>
                  {TRABAJO_TIPOS_GRUPOS.map((grupo) => (
                    <SelectGroup key={grupo.label}>
                      <SelectLabel>{grupo.label}</SelectLabel>
                      {grupo.tipos.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ha">Ha trabajadas</Label>
              <Input
                id="ha"
                name="ha"
                type="number"
                step="0.1"
                defaultValue={lote.ha}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa">Empresa / Operario</Label>
              <Input
                id="empresa"
                name="empresa"
                placeholder="Contratista o propio"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costo_labor">
                Costo mano de obra / máquina ($)
              </Label>
              <Input
                id="costo_labor"
                name="costo_labor"
                type="number"
                step="0.01"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="obs">Observaciones</Label>
              <Input
                id="obs"
                name="obs"
                placeholder="Condiciones, incidencias..."
              />
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Insumos / Productos utilizados
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(EMPTY_INSUMO)}
              >
                <IconPlus size={14} /> Agregar insumo
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-xs text-neutral-400">
                Opcional — agregá los productos usados en este trabajo.
              </p>
            )}

            {fields.map((field, i) => (
              <div
                key={field.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1.4fr_auto] items-end gap-2 rounded-lg bg-neutral-50 p-2"
              >
                <Input
                  placeholder="Nombre del producto"
                  {...register(`insumos.${i}.descripcion`)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Cant."
                  {...register(`insumos.${i}.cantidad`)}
                />
                <select
                  className={selectNativeClass}
                  {...register(`insumos.${i}.unidad`)}
                >
                  {TRABAJO_UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="$/ud."
                  {...register(`insumos.${i}.precio_unit`)}
                />
                <select
                  className={selectNativeClass}
                  {...register(`insumos.${i}.factura_id`)}
                >
                  <option value="">— Sin factura —</option>
                  {facturas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.numero} — {f.proveedor}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => remove(i)}
                >
                  <IconTrash size={14} />
                </Button>
              </div>
            ))}

            <div className="flex justify-end text-sm text-neutral-600">
              Total insumos:{" "}
              <strong className="ml-1.5 text-neutral-900">
                $
                {totalInsumos.toLocaleString("es-AR", {
                  maximumFractionDigits: 0,
                })}
              </strong>
            </div>
          </div>

          {state.status === "error" && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Registrar trabajo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
