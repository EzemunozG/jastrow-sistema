import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatFecha, formatKg, formatMoney, formatNumber } from "@/lib/format";
import { importeVenta, resumenVentas, type VentaAzucarRow } from "@/lib/ventas-azucar";

export function VentasTable({
  ventas,
  ingenioNombre,
}: {
  ventas: VentaAzucarRow[];
  ingenioNombre: (id: string) => string;
}) {
  if (ventas.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Todavía no hay ventas de azúcar registradas"
        description="Cuando se carguen, cada operación va a aparecer acá y sus kilos se descuentan del disponible de Azúcar por ingenio."
      />
    );
  }

  const total = resumenVentas(ventas);

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="p-2.5 font-normal">Fecha</th>
            <th className="p-2.5 font-normal">Ingenio</th>
            <th className="p-2.5 text-right font-normal">Bolsas</th>
            <th className="p-2.5 text-right font-normal">Kg</th>
            <th className="p-2.5 text-right font-normal">Precio unit. c/IVA</th>
            <th className="p-2.5 text-right font-normal">Total</th>
            <th className="p-2.5 font-normal">Comprobante</th>
            <th className="p-2.5 font-normal">Comprador</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((v) => {
            const importe = importeVenta(v);
            return (
              <tr key={v.id} className="border-b transition-colors last:border-0 hover:bg-muted">
                <td className="p-2.5 whitespace-nowrap">{formatFecha(v.fecha)}</td>
                <td className="p-2.5">{ingenioNombre(v.ingenio_id)}</td>
                <td className="p-2.5 text-right">{formatNumber(v.bolsas, 0)}</td>
                <td className="p-2.5 text-right">{formatKg(v.kg)}</td>
                <td className="p-2.5 text-right">
                  {v.precio_unit_con_iva != null
                    ? formatMoney(v.precio_unit_con_iva)
                    : "—"}
                </td>
                <td className="p-2.5 text-right font-medium">
                  {importe > 0 ? formatMoney(importe) : "—"}
                </td>
                <td className="p-2.5 text-muted-foreground">{v.comprobante ?? "—"}</td>
                <td className="p-2.5 text-muted-foreground">{v.comprador ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted font-medium">
            <td className="p-2.5" colSpan={2}>
              {total.operaciones} venta{total.operaciones !== 1 ? "s" : ""}
            </td>
            <td className="p-2.5 text-right">{formatNumber(total.bolsas, 0)}</td>
            <td className="p-2.5 text-right">{formatKg(total.kg)}</td>
            <td className="p-2.5" />
            <td className="p-2.5 text-right">
              {formatMoney(total.importe)}
              {total.importe_incompleto && "+"}
            </td>
            <td className="p-2.5" colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
