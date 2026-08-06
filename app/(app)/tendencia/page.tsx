export const dynamic = "force-dynamic";

import { TendenciaCharts } from "@/components/tendencia/tendencia-charts";
import {
  INGENIOS,
  META,
  fechasUnicas,
  statsFor,
  sum,
  type InfrarutRow,
  type Stats,
} from "@/lib/business-rules";
import { formatKg, formatNumber, formatPercent, formatTn } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type IngenioRow = {
  fecha: string;
  ingenioId: string;
  label: string;
  stats: Stats;
};

export default async function TendenciaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("infraruts").select("*").order("cp");

  const infraruts: InfrarutRow[] = (data ?? []).map((r) => ({
    cp: r.cp,
    ingenio_id: r.ingenio_id,
    remito: r.remito,
    fecha: r.fecha,
    finca_id: r.finca_id,
    veh: r.veh,
    maq: r.maq,
    kg_neto: r.kg_neto ?? 0,
    kg_trash: r.kg_trash ?? 0,
    kg_azucar: r.kg_azucar ?? 0,
    brix: r.brix ?? 0,
    pol: r.pol ?? 0,
    pureza: r.pureza ?? 0,
    rdto: r.rdto ?? 0,
  }));

  if (infraruts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Todavía no hay viajes de INFRARUT cargados — importalos desde Resumen.
      </div>
    );
  }

  // Esta pantalla es enteramente "por día": un viaje sin fecha transcripta no tiene
  // dónde ubicarse en el eje X, así que queda fuera del gráfico y de la tabla. No se
  // silencia — se avisa abajo con cuántos son y cuántas toneladas representan, para
  // que la diferencia contra el total de Resumen quede explicada.
  const fechas = fechasUnicas(infraruts);
  const sinFechaRows = infraruts.filter((r) => r.fecha == null);
  const tnSinFecha = sum(sinFechaRows, (r) => r.kg_neto) / 1000;

  // Agrupado por ingenio_id, no por finca_id — ver rdto-viaje-chart.tsx (misma razón:
  // finca_id no distingue Trinidad de Concepción de forma unívoca).
  const rows: IngenioRow[] = [];
  for (const f of fechas) {
    for (const ingenio of INGENIOS) {
      const v = infraruts.filter((r) => r.fecha === f && r.ingenio_id === ingenio.id);
      if (!v.length) continue;
      const s = statsFor(v);
      if (s) rows.push({ fecha: f, ingenioId: ingenio.id, label: ingenio.nombre, stats: s });
    }
  }

  const concMap = new Map(
    rows.filter((r) => r.ingenioId === "concepcion").map((r) => [r.fecha, r.stats]),
  );
  const trinMap = new Map(
    rows.filter((r) => r.ingenioId === "trinidad").map((r) => [r.fecha, r.stats]),
  );

  const rdtoData = fechas.map((f) => ({
    fecha: f.slice(5),
    CONCEPCION: concMap.get(f)?.rdto ?? null,
    TRINIDAD: trinMap.get(f)?.rdto ?? null,
  }));
  const polData = fechas.map((f) => ({
    fecha: f.slice(5),
    CONCEPCION: concMap.get(f)?.pol ?? null,
    TRINIDAD: trinMap.get(f)?.pol ?? null,
  }));
  const purezaData = fechas.map((f) => ({
    fecha: f.slice(5),
    CONCEPCION: concMap.get(f)?.pureza ?? null,
    TRINIDAD: trinMap.get(f)?.pureza ?? null,
  }));

  // index_10.html:1240-1241 — escala dinámica para que ningún punto quede fuera del gráfico
  const rdtos = rows.map((r) => r.stats.rdto);
  const rdtoDomain: [number, number] = [
    Math.floor(Math.min(...rdtos, META) * 2) / 2 - 0.5,
    Math.ceil(Math.max(...rdtos, META) * 2) / 2 + 0.5,
  ];

  const prevByIngenio = new Map<string, Stats>();
  const colorByIngenio: Record<string, string> = {
    concepcion: "#378ADD",
    trinidad: "#1D9E75",
  };

  if (fechas.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Los {infraruts.length} viajes cargados todavía no tienen fecha de salida
        transcripta de la libreta, así que no hay nada que graficar por día. Sus kg y
        su azúcar sí están contados en Resumen, Viajes y Rendimiento.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sinFechaRows.length > 0 && (
        <p className="rounded-lg border-l-4 border-l-blue-600 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">
          {sinFechaRows.length} viaje{sinFechaRows.length !== 1 ? "s" : ""} sin fecha
          de salida transcripta ({formatTn(tnSinFecha)}) no {sinFechaRows.length !== 1 ? "están" : "está"} incluido
          {sinFechaRows.length !== 1 ? "s" : ""} en este gráfico ni en la tabla de
          abajo — sí suman en los totales de Resumen y en el rendimiento por lote.
        </p>
      )}

      <TendenciaCharts
        rdtoData={rdtoData}
        polData={polData}
        purezaData={purezaData}
        rdtoDomain={rdtoDomain}
      />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-2 font-normal">Fecha</th>
              <th className="p-2 font-normal">Ingenio</th>
              <th className="p-2 font-normal">Viajes</th>
              <th className="p-2 font-normal">Tn netas</th>
              <th className="p-2 font-normal">Brix%</th>
              <th className="p-2 font-normal">POL%</th>
              <th className="p-2 font-normal">Pureza%</th>
              <th className="p-2 font-normal">Rdto%</th>
              <th className="p-2 font-normal">Trash%</th>
              <th className="p-2 font-normal">Kg azúcar</th>
              <th className="p-2 font-normal">Δ vs. día anterior</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const prev = prevByIngenio.get(r.ingenioId);
              const delta = prev ? r.stats.rdto - prev.rdto : null;
              prevByIngenio.set(r.ingenioId, r.stats);
              return (
                <tr
                  key={`${r.fecha}-${r.ingenioId}`}
                  className="border-b transition-colors last:border-0 hover:bg-muted"
                >
                  <td className="p-2">{r.fecha.slice(5)}</td>
                  <td className="p-2">
                    <span
                      className="mr-1.5 inline-block size-2 rounded-full"
                      style={{ backgroundColor: colorByIngenio[r.ingenioId] }}
                    />
                    {r.label}
                  </td>
                  <td className="p-2">{r.stats.n}</td>
                  <td className="p-2">{formatTn(r.stats.kg_neto / 1000)}</td>
                  <td className="p-2">{formatNumber(r.stats.brix, 2)}</td>
                  <td className="p-2">{formatNumber(r.stats.pol, 2)}</td>
                  <td className="p-2">{formatNumber(r.stats.pureza, 2)}</td>
                  <td className="p-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.stats.rdto >= META
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : r.stats.rdto >= 9.5
                            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {formatPercent(r.stats.rdto)}
                    </span>
                  </td>
                  <td className="p-2">{formatPercent(r.stats.trash_pct)}</td>
                  <td className="p-2">{formatKg(r.stats.kg_azucar)}</td>
                  <td className="p-2">
                    {delta !== null ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          delta >= 0
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {delta >= 0 ? "+" : ""}
                        {formatNumber(delta, 2)}pp
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
