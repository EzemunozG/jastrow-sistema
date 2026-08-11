import { PESO_BOLSA } from "@/lib/costos";
import type { ResumenAzucar, TotalAzucar } from "@/lib/azucar";
import { formatKg, formatNumber, formatPercent, formatTn } from "@/lib/format";

// Color por ingenio: los mismos que ya usan Resumen y Tendencia para las series.
const COLOR_INGENIO: Record<string, string> = {
  concepcion: "#378ADD",
  trinidad: "#1D9E75",
};

function Metric({
  lbl,
  val,
  sub,
  destacado,
}: {
  lbl: string;
  val: string;
  sub?: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${destacado ? "border-brand/30 bg-brand/5" : ""}`}
    >
      <div className="text-xs text-muted-foreground">{lbl}</div>
      <div className={`font-semibold ${destacado ? "text-xl text-brand" : "text-lg"}`}>
        {val}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function AzucarCard({ resumen }: { resumen: ResumenAzucar }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: COLOR_INGENIO[resumen.ingenio_id] }}
          />
          {resumen.nombre}
        </h2>
        <span className="text-xs text-muted-foreground">
          {formatNumber(resumen.viajes)} viajes
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Metric
          lbl="Caña neta entregada"
          val={formatTn(resumen.kg_cana_neta / 1000)}
          sub={`${formatKg(resumen.kg_cana_neta)}`}
        />
        <Metric
          lbl="Azúcar producida"
          val={formatTn(resumen.kg_azucar_producida / 1000)}
          sub={`${formatKg(resumen.kg_azucar_producida)}`}
        />
        <Metric
          lbl="Azúcar propia / disponible"
          val={formatKg(resumen.kg_azucar_propia)}
          sub={`${formatPercent(resumen.pct_sobre_producida, 1)} de la producida`}
          destacado
        />
        <Metric
          lbl={`Bolsas de ${PESO_BOLSA} kg`}
          val={formatNumber(resumen.bolsas_propias, 0)}
          sub="lo que alimenta el arriendo"
          destacado
        />
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="font-medium">Regla aplicada:</span> {resumen.regla}.
      </p>
    </div>
  );
}

export function AzucarTotal({ total }: { total: TotalAzucar }) {
  return (
    <div className="space-y-3 rounded-xl border-2 bg-card p-4">
      <h2 className="text-base font-semibold">Total consolidado — ambos ingenios</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          lbl="Caña neta entregada"
          val={formatTn(total.kg_cana_neta / 1000)}
          sub={`${formatNumber(total.viajes)} viajes`}
        />
        <Metric
          lbl="Azúcar producida"
          val={formatTn(total.kg_azucar_producida / 1000)}
          sub={formatKg(total.kg_azucar_producida)}
        />
        <Metric
          lbl="Azúcar propia / disponible"
          val={formatKg(total.kg_azucar_propia)}
          sub={`${formatPercent(total.pct_sobre_producida, 1)} de la producida`}
          destacado
        />
        <Metric
          lbl={`Bolsas de ${PESO_BOLSA} kg`}
          val={formatNumber(total.bolsas_propias, 0)}
          sub="total disponible"
          destacado
        />
      </div>
    </div>
  );
}
