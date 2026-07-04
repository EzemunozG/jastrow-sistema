"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { deleteLote } from "@/actions/lotes";
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
import { LoteFormDialog } from "./lote-form-dialog";
import { TrabajosDialog } from "./trabajos-dialog";

type Lote = Database["public"]["Tables"]["lotes"]["Row"];
type Finca = Database["public"]["Tables"]["fincas"]["Row"];
type Factura = Database["public"]["Tables"]["facturas"]["Row"];
type TrabajoInsumo = Database["public"]["Tables"]["trabajo_insumos"]["Row"];
type Trabajo = Database["public"]["Tables"]["trabajos"]["Row"] & {
  insumos: TrabajoInsumo[];
};

const ESTADO_VARIANT = {
  Pendiente: "secondary",
  "En cosecha": "default",
  Cosechado: "outline",
} as const;

function fmtMonto(n: number) {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function LotesTable({
  lotes,
  fincas,
  trabajos,
  facturas,
}: {
  lotes: Lote[];
  fincas: Finca[];
  trabajos: Trabajo[];
  facturas: Factura[];
}) {
  const [selected, setSelected] = useState<Lote | null>(null);
  const [open, setOpen] = useState(false);
  // Fuerza un remount del diálogo (y de su useActionState interno) en cada apertura,
  // para que el estado de un guardado anterior no cierre el diálogo prematuramente.
  const [dialogKey, setDialogKey] = useState(0);

  const [trabajosDialogLote, setTrabajosDialogLote] = useState<Lote | null>(
    null,
  );
  const [trabajosOpen, setTrabajosOpen] = useState(false);

  function openNew() {
    setSelected(null);
    setDialogKey((k) => k + 1);
    setOpen(true);
  }

  function openEdit(lote: Lote) {
    setSelected(lote);
    setDialogKey((k) => k + 1);
    setOpen(true);
  }

  function openTrabajos(lote: Lote) {
    setTrabajosDialogLote(lote);
    setTrabajosOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}>
          <IconPlus size={14} /> Nuevo lote
        </Button>
      </div>

      <div className="rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Ha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Finca</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotes.map((l) => {
              const trabajosLote = trabajos.filter((t) => t.lote_id === l.id);
              const costoLote = trabajosLote.reduce(
                (s, t) => s + (t.costo_total || 0),
                0,
              );
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.id}</TableCell>
                  <TableCell>{l.nombre ?? "—"}</TableCell>
                  <TableCell>{l.ha}</TableCell>
                  <TableCell>{l.tipo}</TableCell>
                  <TableCell>
                    {fincas.find((f) => f.id === l.finca_id)?.nombre ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[l.estado]}>
                      {l.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-emerald-700">
                    {costoLote > 0 ? fmtMonto(costoLote) : "—"}
                  </TableCell>
                  <TableCell className="flex gap-2 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTrabajos(l)}
                    >
                      Trabajos ({trabajosLote.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(l)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteLote(l.id)}
                    >
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {lotes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-neutral-400"
                >
                  Sin lotes cargados todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <LoteFormDialog
        key={dialogKey}
        fincas={fincas}
        lote={selected}
        open={open}
        onOpenChange={setOpen}
      />

      {trabajosDialogLote && (
        <TrabajosDialog
          lote={trabajosDialogLote}
          trabajos={trabajos.filter(
            (t) => t.lote_id === trabajosDialogLote.id,
          )}
          facturas={facturas}
          open={trabajosOpen}
          onOpenChange={setTrabajosOpen}
        />
      )}
    </div>
  );
}
