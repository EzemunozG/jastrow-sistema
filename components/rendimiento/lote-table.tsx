import { META } from "@/lib/business-rules";
import type { RendimientoLote } from "@/lib/reconciliation";

export function LoteTable({ lotes }: { lotes: RendimientoLote[] }) {
  if (lotes.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-neutral-400">
        Todavía no hay lotes con metadata cargada para este ingenio.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="py-1 pr-3 font-normal">Lote</th>
            <th className="py-1 pr-3 font-normal">Ha</th>
            <th className="py-1 pr-3 font-normal">Surcos totales</th>
            <th className="py-1 pr-3 font-normal">Viajes</th>
            <th className="py-1 pr-3 font-normal">Kg neto</th>
            <th className="py-1 pr-3 font-normal">Tn/ha</th>
            <th className="py-1 pr-3 font-normal">Kg/surco</th>
            <th className="py-1 pr-3 font-normal">Rdto%</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((l) =>
            l.n === 0 ? (
              <tr key={l.lote_key} className="border-t text-neutral-400">
                <td className="py-1.5 pr-3 font-medium">{l.nombre}</td>
                <td className="py-1.5 pr-3">{l.ha.toLocaleString("es-AR")}</td>
                <td className="py-1.5 pr-3">
                  {Math.round(l.ha * l.surcos_por_ha).toLocaleString("es-AR")}
                </td>
                <td className="py-1.5 pr-3" colSpan={5}>
                  Sin datos
                </td>
              </tr>
            ) : (
              <tr key={l.lote_key} className="border-t">
                <td className="py-1.5 pr-3 font-semibold">{l.nombre}</td>
                <td className="py-1.5 pr-3">{l.ha.toLocaleString("es-AR")}</td>
                <td className="py-1.5 pr-3">
                  {Math.round(l.ha * l.surcos_por_ha).toLocaleString("es-AR")}
                </td>
                <td className="py-1.5 pr-3">{l.n}</td>
                <td className="py-1.5 pr-3">
                  {l.kg_neto_total.toLocaleString("es-AR")}
                </td>
                <td className="py-1.5 pr-3">{l.tn_ha.toFixed(2)}</td>
                <td className="py-1.5 pr-3">{l.kg_surco.toFixed(2)}</td>
                <td className="py-1.5 pr-3">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      l.rdto_promedio >= META
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {l.rdto_promedio.toFixed(2)}%
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
