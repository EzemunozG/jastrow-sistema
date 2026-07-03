"use client";

import { useActionState, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { saveFactura } from "@/actions/facturas";
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
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/lib/database.types";
import {
  FACTURA_ACTION_IDLE,
  FACTURA_CATEGORIAS,
  FACTURA_TIPOS,
} from "@/lib/forms/facturas";

type FacturaItem = Database["public"]["Tables"]["factura_items"]["Row"];
type Factura = Database["public"]["Tables"]["facturas"]["Row"] & {
  items: FacturaItem[];
};

type ItemRow = {
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio_unit: number;
};

const EMPTY_ITEM: ItemRow = {
  descripcion: "",
  cantidad: 1,
  unidad: "kg",
  precio_unit: 0,
};

export function FacturaFormDialog({
  factura,
  open,
  onOpenChange,
}: {
  factura?: Factura | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    saveFactura,
    FACTURA_ACTION_IDLE,
  );

  // El padre remonta este componente en cada apertura (key={dialogKey}), así que los
  // defaultValues de useForm ya reflejan la factura correcta sin necesidad de un effect.
  const { control, register, watch } = useForm<{ items: ItemRow[] }>({
    defaultValues: {
      items: factura?.items.length
        ? factura.items.map((it) => ({
            descripcion: it.descripcion ?? "",
            cantidad: it.cantidad ?? 1,
            unidad: it.unidad ?? "kg",
            precio_unit: it.precio_unit ?? 0,
          }))
        : [EMPTY_ITEM],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const total = items.reduce(
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
          <DialogTitle>
            {factura ? "Editar factura" : "Registrar factura / comprobante"}
          </DialogTitle>
        </DialogHeader>

        <form action={action} className="space-y-4">
          {factura && (
            <input type="hidden" name="idOriginal" value={factura.id} />
          )}
          {factura?.img_path && (
            <input
              type="hidden"
              name="existingImgPath"
              value={factura.img_path}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="numero">N° comprobante *</Label>
              <Input
                id="numero"
                name="numero"
                defaultValue={factura?.numero ?? ""}
                placeholder="0001-00012345"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Select name="tipo" defaultValue={factura?.tipo ?? FACTURA_TIPOS[0]}>
                <SelectTrigger id="tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACTURA_TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proveedor">Proveedor *</Label>
              <Input
                id="proveedor"
                name="proveedor"
                defaultValue={factura?.proveedor ?? ""}
                placeholder="Nombre del proveedor"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                name="cuit"
                defaultValue={factura?.cuit ?? ""}
                placeholder="20-12345678-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                name="fecha"
                type="date"
                defaultValue={factura?.fecha ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoría</Label>
              <Select
                name="categoria"
                defaultValue={factura?.categoria ?? FACTURA_CATEGORIAS[0]}
              >
                <SelectTrigger id="categoria" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACTURA_CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="obs">Observaciones</Label>
              <Textarea
                id="obs"
                name="obs"
                rows={2}
                defaultValue={factura?.obs ?? ""}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ítems de la factura</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(EMPTY_ITEM)}
              >
                <IconPlus size={14} /> Ítem
              </Button>
            </div>

            {fields.map((field, i) => (
              <div
                key={field.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-end gap-2"
              >
                <Input
                  placeholder="Descripción"
                  {...register(`items.${i}.descripcion`)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Cant."
                  {...register(`items.${i}.cantidad`)}
                />
                <Input placeholder="ud." {...register(`items.${i}.unidad`)} />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="$/ud."
                  {...register(`items.${i}.precio_unit`)}
                />
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
            ))}

            <div className="flex justify-end">
              <div className="rounded-lg bg-neutral-50 px-3 py-1.5 text-sm">
                Total:{" "}
                <strong className="ml-1.5 text-base text-emerald-700">
                  $
                  {total.toLocaleString("es-AR", {
                    maximumFractionDigits: 0,
                  })}
                </strong>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 border-t pt-3">
            <Label htmlFor="img_file">
              Foto / imagen del comprobante (opcional)
            </Label>
            <Input
              id="img_file"
              name="img_file"
              type="file"
              accept="image/*,application/pdf"
            />
            {factura?.img_path && (
              <p className="text-xs text-neutral-500">
                Ya hay un archivo cargado — subí uno nuevo solo si querés
                reemplazarlo.
              </p>
            )}
          </div>

          {state.status === "error" && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar factura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
