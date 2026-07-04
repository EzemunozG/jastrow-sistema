"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import { RecetaFormDialog } from "./receta-form-dialog";

type Receta = Database["public"]["Tables"]["recetas"]["Row"];
type RecetaItem = Database["public"]["Tables"]["receta_items"]["Row"];
type Lote = Database["public"]["Tables"]["lotes"]["Row"];
type Producto = Database["public"]["Tables"]["productos"]["Row"];

function fmtMonto(n: number) {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function RecetasView({
  recetas,
  itemsByReceta,
  lotesByReceta,
  lotes,
  productos,
  precioProm,
}: {
  recetas: Receta[];
  itemsByReceta: Map<string, RecetaItem[]>;
  lotesByReceta: Map<string, string[]>;
  lotes: Lote[];
  productos: Producto[];
  precioProm: Map<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  function openNew() {
    setDialogKey((k) => k + 1);
    setOpen(true);
  }

  const loteById = new Map(lotes.map((l) => [l.id, l]));
  const productoById = new Map(productos.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}>
          <IconPlus size={14} /> Nueva receta
        </Button>
      </div>

      {recetas.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center text-sm text-neutral-400">
          Sin recetas registradas. Usá &quot;+ Nueva receta&quot; para cargar la
          primera aplicación.
        </div>
      ) : (
        <div className="space-y-3">
          {recetas.map((r) => {
            const items = itemsByReceta.get(r.id) ?? [];
            const loteIds = lotesByReceta.get(r.id) ?? [];
            const lotesNames = loteIds
              .map((id) => {
                const l = loteById.get(id);
                return l ? `${l.id}${l.nombre ? ` (${l.nombre})` : ""}` : id;
              })
              .join(", ");
            const faltaPrecio = items.some((it) => (it.precio_unit ?? 0) === 0);
            return (
              <div key={r.id} className="rounded-xl border bg-white p-4">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{r.nombre}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{r.fecha}</Badge>
                      <Badge variant="default">{r.ha} ha</Badge>
                      <Badge variant="outline">{r.tipo}</Badge>
                      {r.empresa && <Badge variant="outline">{r.empresa}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Lotes: {lotesNames || "—"}
                    </div>
                    {r.obs && (
                      <div className="mt-1 text-xs text-neutral-400">{r.obs}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-neutral-400">Costo total</div>
                    <div
                      className={`text-lg font-semibold ${r.costo_total > 0 ? "text-emerald-700" : "text-amber-700"}`}
                    >
                      {r.costo_total > 0 ? fmtMonto(r.costo_total) : "Parcial*"}
                    </div>
                    {r.costo_ha > 0 && (
                      <div className="text-xs text-neutral-400">
                        {fmtMonto(r.costo_ha)}/ha
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-neutral-500">
                        <th className="py-1 pr-3 font-normal">Producto</th>
                        <th className="py-1 pr-3 font-normal">Dosis</th>
                        <th className="py-1 pr-3 font-normal">Total usado</th>
                        <th className="py-1 pr-3 font-normal">Precio unit.</th>
                        <th className="py-1 pr-3 font-normal">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.id} className="border-t">
                          <td className="py-1.5 pr-3 font-medium">
                            {productoById.get(it.producto_id ?? "")?.nombre ??
                              "—"}
                          </td>
                          <td className="py-1.5 pr-3">
                            {it.dosis} {it.unidad}/ha
                          </td>
                          <td className="py-1.5 pr-3">
                            {(it.cantidad ?? 0).toLocaleString("es-AR", {
                              maximumFractionDigits: 2,
                            })}{" "}
                            {it.unidad}
                          </td>
                          <td className="py-1.5 pr-3">
                            {(it.precio_unit ?? 0) > 0 ? (
                              fmtMonto(it.precio_unit ?? 0)
                            ) : (
                              <span className="text-amber-700">Sin precio</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-3 font-medium">
                            {(it.total ?? 0) > 0 ? fmtMonto(it.total ?? 0) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {faltaPrecio && (
                  <p className="mt-2 text-xs text-amber-700">
                    * Costo incompleto — faltan precios de:{" "}
                    {items
                      .filter((it) => (it.precio_unit ?? 0) === 0)
                      .map((it) => productoById.get(it.producto_id ?? "")?.nombre)
                      .join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <RecetaFormDialog
        key={dialogKey}
        lotes={lotes}
        productos={productos}
        precioProm={precioProm}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
