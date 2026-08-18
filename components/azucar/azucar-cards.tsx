import { PESO_BOLSA } from "@/lib/costos";
import type { ResumenAzucar, TotalAzucar } from "@/lib/azucar";
import type { VentasIngenio } from "@/lib/ventas-azucar";
import { formatKg, formatMoney, formatNumber, formatPercent, formatTn } from "@/lib/format";

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

// Vendida + disponible, debajo de la azúcar propia. Sin ventas cargadas se muestra
// solo el disponible (que es toda la propia), sin una línea "Vendida: 0" que no aporta.
function VentasBlock({ v }: { v: VentasIngenio }) {
  const hayVentas = v.ventas.operaciones > 0;
  return (
    <div className="space-y-1 rounded-lg border border-dashed p-3 text-sm">
      {hayVentas && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-muted-foreground">Vendida</span>
          <span className="font-medium">
            {formatNumber(v.ventas.bolsas, 0)} bolsas (
            {v.ventas.importe > 0 ? formatMoney(v.ventas.importe) : "sin importe"}
            {v.ventas.importe > 0 && v.ventas.importe_incompleto ? "+" : ""})
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-muted-foreground">Disponible</span>
        <span
          className={`font-semibold ${v.disponible.sobrevendido ? "text-red-700 dark:text-red-300" : ""}`}
        >
          {formatTn(v.disponible.tn)} ({formatNumber(v.disponible.bolsas, 0)} bolsas)
        </span>
      </div>
      {v.disponible.sobrevendido && (
        <p className="text-[11px] text-red-700 dark:text-red-300">
          Se vendió más azúcar de la que da la fórmula provisional — revisar los kg
          cargados o la regla de reparto.
        </p>
      )}
      {hayVentas && v.ventas.importe_incompleto && (
        <p className="text-[11px] text-muted-foreground">
          Hay ventas sin importe cargado: el monto que se muestra es parcial (los kilos
          sí están descontados).
        </p>
      )}
    </div>
  );
}

export function AzucarCard({
  resumen,
  ventas,
}: {
  resumen: ResumenAzucar;
  ventas: VentasIngenio;
}) {
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
          lbl="Caña entregada"
          val={formatTn(resumen.kg_cana_neta / 1000)}
          sub={`neta · bruta ${formatTn(resumen.kg_cana_bruta / 1000)}`}
        />
        <Metric
          lbl="Azúcar producida"
          val={formatTn(resumen.kg_azucar_producida / 1000)}
          sub={`${formatKg(resumen.kg_azucar_producida)}`}
        />
        <Metric
          lbl="Azúcar propia"
          val={formatKg(resumen.kg_azucar_propia)}
          sub={`${formatPercent(resumen.pct_sobre_producida, 1)} de la producida`}
          destacado
        />
        <Metric
          lbl={`Bolsas de ${PESO_BOLSA} kg`}
          val={formatNumber(resumen.bolsas_propias, 0)}
          sub="propias, antes de ventas"
          destacado
        />
      </div>

      <VentasBlock v={ventas} />

      <p className="text-xs text-muted-foreground">
        <span className="font-medium">Regla aplicada:</span> {resumen.regla}.
      </p>
    </div>
  );
}

export function AzucarTotal({
  total,
  ventas,
}: {
  total: TotalAzucar;
  ventas: VentasIngenio;
}) {
  return (
    <div className="space-y-3 rounded-xl border-2 bg-card p-4">
      <h2 className="text-base font-semibold">Total consolidado — ambos ingenios</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          lbl="Caña entregada"
          val={formatTn(total.kg_cana_neta / 1000)}
          sub={`neta · ${formatNumber(total.viajes)} viajes`}
        />
        <Metric
          lbl="Azúcar producida"
          val={formatTn(total.kg_azucar_producida / 1000)}
          sub={formatKg(total.kg_azucar_producida)}
        />
        <Metric
          lbl="Azúcar propia"
          val={formatKg(total.kg_azucar_propia)}
          sub={`${formatPercent(total.pct_sobre_producida, 1)} de la producida`}
          destacado
        />
        <Metric
          lbl={`Bolsas de ${PESO_BOLSA} kg`}
          val={formatNumber(total.bolsas_propias, 0)}
          sub="propias, antes de ventas"
          destacado
        />
      </div>

      <VentasBlock v={ventas} />
    </div>
  );
}
