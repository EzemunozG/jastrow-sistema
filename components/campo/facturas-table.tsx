"use client";

import { useState } from "react";
import { IconPhoto, IconPlus } from "@tabler/icons-react";
import { deleteFactura } from "@/actions/facturas";
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
import { FacturaFormDialog } from "./factura-form-dialog";

type FacturaItem = Database["public"]["Tables"]["factura_items"]["Row"];
type Factura = Database["public"]["Tables"]["facturas"]["Row"] & {
  items: FacturaItem[];
  imgUrl: string | null;
};

export function FacturasTable({ facturas }: { facturas: Factura[] }) {
  const [selected, setSelected] = useState<Factura | null>(null);
  const [open, setOpen] = useState(false);
  // Fuerza un remount del diálogo (y de su estado de form interno) en cada apertura, para
  // que una factura anterior no quede "pegada" en el formulario del próximo alta/edición.
  const [dialogKey, setDialogKey] = useState(0);

  function openNew() {
    setSelected(null);
    setDialogKey((k) => k + 1);
    setOpen(true);
  }

  function openEdit(factura: Factura) {
    setSelected(factura);
    setDialogKey((k) => k + 1);
    setOpen(true);
  }

  const total = facturas.reduce((s, f) => s + (f.total || 0), 0);
  const byCategoria = new Map<string, number>();
  for (const f of facturas) {
    const cat = f.categoria ?? "Sin categoría";
    byCategoria.set(cat, (byCategoria.get(cat) ?? 0) + (f.total || 0));
  }
  const topCategorias = [...byCategoria.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[140px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">Total facturas</div>
          <div className="text-lg font-semibold">{facturas.length}</div>
          <div className="text-xs text-neutral-400">comprobantes</div>
        </div>
        <div className="min-w-[140px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">Monto total</div>
          <div className="text-lg font-semibold">{fmtMonto(total)}</div>
          <div className="text-xs text-neutral-400">registrado</div>
        </div>
        {topCategorias.map(([cat, monto]) => (
          <div
            key={cat}
            className="min-w-[140px] flex-1 rounded-xl border bg-white p-3"
          >
            <div className="text-xs text-neutral-500">{cat}</div>
            <div className="text-lg font-semibold">{fmtMonto(monto)}</div>
            <div className="text-xs text-neutral-400">
              {total > 0 ? ((monto / total) * 100).toFixed(0) : 0}% del total
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}>
          <IconPlus size={14} /> Nueva factura
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° comprobante</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>CUIT</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {facturas.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.numero}</TableCell>
                <TableCell>
                  <Badge variant="outline">{f.tipo}</Badge>
                </TableCell>
                <TableCell>{f.proveedor}</TableCell>
                <TableCell className="text-xs text-neutral-500">
                  {f.cuit || "—"}
                </TableCell>
                <TableCell>{f.fecha}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{f.categoria}</Badge>
                </TableCell>
                <TableCell className="font-medium text-emerald-700">
                  {fmtMonto(f.total || 0)}
                </TableCell>
                <TableCell className="flex gap-2 whitespace-nowrap">
                  {f.imgUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={f.imgUrl} target="_blank" rel="noreferrer">
                        <IconPhoto size={14} />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(f)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteFactura(f.id, f.img_path)}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {facturas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-neutral-400"
                >
                  No hay facturas registradas aún.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FacturaFormDialog
        key={dialogKey}
        factura={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
