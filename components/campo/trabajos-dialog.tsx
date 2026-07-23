"use client";

import { useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { deleteTrabajo } from "@/actions/trabajos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { TrabajoFormDialog } from "./trabajo-form-dialog";

type Lote = Database["public"]["Tables"]["lotes"]["Row"];
type Factura = Database["public"]["Tables"]["facturas"]["Row"];
type TrabajoInsumo = Database["public"]["Tables"]["trabajo_insumos"]["Row"];
type Trabajo = Database["public"]["Tables"]["trabajos"]["Row"] & {
  insumos: TrabajoInsumo[];
};

export function TrabajosDialog({
  lote,
  trabajos,
  facturas,
  open,
  onOpenChange,
}: {
  lote: Lote;
  trabajos: Trabajo[];
  facturas: Factura[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const costoTotal = trabajos.reduce((s, t) => s + (t.costo_total || 0), 0);

  function openForm() {
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Trabajos — {lote.id}
              {lote.nombre ? ` — ${lote.nombre}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-3">
            <div className="min-w-[110px] flex-1 rounded-xl border p-3">
              <div className="text-xs text-neutral-500">Trabajos</div>
              <div className="text-lg font-semibold">{trabajos.length}</div>
            </div>
            <div className="min-w-[110px] flex-1 rounded-xl border p-3">
              <div className="text-xs text-neutral-500">Costo total</div>
              <div className="text-lg font-semibold">
                {fmtMonto(costoTotal)}
              </div>
            </div>
            <div className="min-w-[110px] flex-1 rounded-xl border p-3">
              <div className="text-xs text-neutral-500">Costo / ha</div>
              <div className="text-lg font-semibold">
                {costoTotal > 0 && lote.ha > 0
                  ? fmtMonto(costoTotal / lote.ha)
                  : "—"}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={openForm}>
              <IconPlus size={14} /> Nuevo trabajo
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ha</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Insumos</TableHead>
                  <TableHead>Costo total</TableHead>
                  <TableHead>Obs.</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {trabajos.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.fecha}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.tipo}</Badge>
                    </TableCell>
                    <TableCell>{t.ha ? `${t.ha} ha` : "—"}</TableCell>
                    <TableCell>{t.empresa || "—"}</TableCell>
                    <TableCell className="max-w-[160px] text-xs text-neutral-500">
                      {t.insumos.length > 0
                        ? t.insumos.map((i) => i.descripcion).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="font-medium text-emerald-700">
                      {fmtMonto(t.costo_total || 0)}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs text-neutral-500">
                      {t.obs || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTrabajo(t.id)}
                      >
                        <IconTrash size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {trabajos.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-neutral-400"
                    >
                      Sin trabajos registrados en este lote.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <TrabajoFormDialog
        key={formKey}
        lote={lote}
        facturas={facturas}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </>
  );
}
