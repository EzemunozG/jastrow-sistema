"use client";

import { useActionState, useEffect, useState } from "react";
import { LOTE_ACTION_IDLE, saveLote } from "@/actions/lotes";
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

type Lote = Database["public"]["Tables"]["lotes"]["Row"];
type Finca = Database["public"]["Tables"]["fincas"]["Row"];

export function LoteFormDialog({
  fincas,
  lote,
  open,
  onOpenChange,
}: {
  fincas: Finca[];
  lote?: Lote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(saveLote, LOTE_ACTION_IDLE);
  // El padre remonta este componente en cada apertura (key={dialogKey}), así que
  // el valor inicial de useState ya refleja el lote correcto sin necesidad de un effect.
  const [tipo, setTipo] = useState<"Propio" | "Arrendado">(
    lote?.tipo ?? "Propio",
  );

  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lote ? "Editar lote" : "Nuevo lote"}</DialogTitle>
        </DialogHeader>

        <form action={action} className="grid grid-cols-2 gap-3">
          {lote && (
            <input type="hidden" name="idOriginal" value={lote.id} />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="id">ID del lote *</Label>
            <Input id="id" name="id" defaultValue={lote?.id} placeholder="Ej: L-10" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre / Potrero</Label>
            <Input id="nombre" name="nombre" defaultValue={lote?.nombre ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ha">Hectáreas *</Label>
            <Input
              id="ha"
              name="ha"
              type="number"
              step="0.1"
              defaultValue={lote?.ha}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              name="tipo"
              value={tipo}
              onValueChange={(v) => setTipo(v as "Propio" | "Arrendado")}
            >
              <SelectTrigger id="tipo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Propio">Propio</SelectItem>
                <SelectItem value="Arrendado">Arrendado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="finca_id">Finca INFRARUT</Label>
            <Select name="finca_id" defaultValue={lote?.finca_id ?? undefined}>
              <SelectTrigger id="finca_id" className="w-full">
                <SelectValue placeholder="Sin vincular" />
              </SelectTrigger>
              <SelectContent>
                {fincas.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="variedad">Variedad</Label>
            <Input
              id="variedad"
              name="variedad"
              defaultValue={lote?.variedad ?? ""}
              placeholder="LCP85-384"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="soca">N° Soca</Label>
            <Input
              id="soca"
              name="soca"
              type="number"
              min={0}
              defaultValue={lote?.soca ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fecha_plantacion">Fecha plantación</Label>
            <Input
              id="fecha_plantacion"
              name="fecha_plantacion"
              type="date"
              defaultValue={lote?.fecha_plantacion ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estado">Estado</Label>
            <Select name="estado" defaultValue={lote?.estado ?? "En cosecha"}>
              <SelectTrigger id="estado" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="En cosecha">En cosecha</SelectItem>
                <SelectItem value="Cosechado">Cosechado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === "Arrendado" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="arriendo">Arriendo (bolsas/ha/año)</Label>
                <Input
                  id="arriendo"
                  name="arriendo"
                  type="number"
                  step="0.5"
                  defaultValue={lote?.arriendo ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="arriendo_obs">Condición de arriendo</Label>
                <Input
                  id="arriendo_obs"
                  name="arriendo_obs"
                  defaultValue={lote?.arriendo_obs ?? ""}
                  placeholder="Ej: pago único anual, mayo"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="lat">Latitud</Label>
            <Input
              id="lat"
              name="lat"
              type="number"
              step="0.000001"
              defaultValue={lote?.lat ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lon">Longitud</Label>
            <Input
              id="lon"
              name="lon"
              type="number"
              step="0.000001"
              defaultValue={lote?.lon ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="propietario">Propietario / Arrendador</Label>
            <Input
              id="propietario"
              name="propietario"
              defaultValue={lote?.propietario ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contrato">N° contrato / escritura</Label>
            <Input id="contrato" name="contrato" defaultValue={lote?.contrato ?? ""} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="obs">Ubicación / Observaciones</Label>
            <Input id="obs" name="obs" defaultValue={lote?.obs ?? ""} />
          </div>

          {state.status === "error" && (
            <p className="col-span-2 text-sm text-red-600">{state.error}</p>
          )}

          <DialogFooter className="col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar lote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
