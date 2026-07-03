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

type Lote = Database["public"]["Tables"]["lotes"]["Row"];
type Finca = Database["public"]["Tables"]["fincas"]["Row"];

const ESTADO_VARIANT = {
  Pendiente: "secondary",
  "En cosecha": "default",
  Cosechado: "outline",
} as const;

export function LotesTable({
  lotes,
  fincas,
}: {
  lotes: Lote[];
  fincas: Finca[];
}) {
  const [selected, setSelected] = useState<Lote | null>(null);
  const [open, setOpen] = useState(false);
  // Fuerza un remount del diálogo (y de su useActionState interno) en cada apertura,
  // para que el estado de un guardado anterior no cierre el diálogo prematuramente.
  const [dialogKey, setDialogKey] = useState(0);

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
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotes.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.id}</TableCell>
                <TableCell>{l.nombre ?? "—"}</TableCell>
                <TableCell>{l.ha}</TableCell>
                <TableCell>{l.tipo}</TableCell>
                <TableCell>
                  {fincas.find((f) => f.id === l.finca_id)?.nombre ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANT[l.estado]}>{l.estado}</Badge>
                </TableCell>
                <TableCell className="flex gap-2">
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
            ))}
            {lotes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
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
    </div>
  );
}
