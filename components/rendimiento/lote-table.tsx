"use client";

import { useSort } from "@/hooks/use-sort";
import { SortButton } from "@/components/ui/sortable-th";
import { META } from "@/lib/business-rules";
import { formatKg, formatNumber, formatPercent } from "@/lib/format";
import type { RendimientoLote } from "@/lib/reconciliation";

type SortKey = "nombre" | "ha" | "surcos" | "n" | "kg_neto_total" | "tn_ha" | "kg_surco" | "rdto_promedio";

export function LoteTable({ lotes }: { lotes: RendimientoLote[] }) {
  const { sorted, sortKey, sortDir, toggleSort } = useSort<RendimientoLote, SortKey>(
    lotes,
    {
      nombre: (l) => l.nombre,
      ha: (l) => l.ha,
      surcos: (l) => l.ha * l.surcos_por_ha,
      n: (l) => l.n,
      kg_neto_total: (l) => l.kg_neto_total,
      tn_ha: (l) => l.tn_ha,
      kg_surco: (l) => l.kg_surco,
      rdto_promedio: (l) => l.rdto_promedio,
    },
    "kg_neto_total",
    "desc",
  );

  if (lotes.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-neutral-400">
        Todavía no hay lotes con metadata cargada para este ingenio.
      </p>
    );
  }

  const th = (label: string, key: SortKey) => (
    <th className="py-1 pr-3 text-left font-normal">
      <SortButton
        label={label}
        sortKey={key}
        activeKey={sortKey}
        dir={sortDir}
        onSort={toggleSort}
      />
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-neutral-500">
            {th("Lote", "nombre")}
            {th("Ha", "ha")}
            {th("Surcos totales", "surcos")}
            {th("Viajes", "n")}
            {th("Kg neto", "kg_neto_total")}
            {th("Tn/ha", "tn_ha")}
            {th("Kg/surco", "kg_surco")}
            {th("Rdto%", "rdto_promedio")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((l) =>
            l.n === 0 ? (
              <tr
                key={l.lote_key}
                className="border-t text-neutral-400 transition-colors hover:bg-neutral-50"
              >
                <td className="py-1.5 pr-3 font-medium">{l.nombre}</td>
                <td className="py-1.5 pr-3">{formatNumber(l.ha, l.ha % 1 ? 1 : 0)}</td>
                <td className="py-1.5 pr-3">
                  {formatNumber(Math.round(l.ha * l.surcos_por_ha))}
                </td>
                <td className="py-1.5 pr-3" colSpan={5}>
                  Sin datos
                </td>
              </tr>
            ) : (
              <tr
                key={l.lote_key}
                className="border-t transition-colors hover:bg-neutral-50"
              >
                <td className="py-1.5 pr-3 font-semibold">{l.nombre}</td>
                <td className="py-1.5 pr-3">{formatNumber(l.ha, l.ha % 1 ? 1 : 0)}</td>
                <td className="py-1.5 pr-3">
                  {formatNumber(Math.round(l.ha * l.surcos_por_ha))}
                </td>
                <td className="py-1.5 pr-3">{l.n}</td>
                <td className="py-1.5 pr-3">{formatKg(l.kg_neto_total)}</td>
                <td className="py-1.5 pr-3">{formatNumber(l.tn_ha, 2)}</td>
                <td className="py-1.5 pr-3">{formatNumber(l.kg_surco, 2)}</td>
                <td className="py-1.5 pr-3">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      l.rdto_promedio >= META
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {formatPercent(l.rdto_promedio)}
                  </span>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
