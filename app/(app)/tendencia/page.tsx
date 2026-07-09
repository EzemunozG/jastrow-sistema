export const dynamic = "force-dynamic";

import { TendenciaCharts } from "@/components/tendencia/tendencia-charts";
import {
  META,
  fechasUnicas,
  porFincaFecha,
  statsFor,
  type InfrarutRow,
  type Stats,
} from "@/lib/business-rules";
import { createClient } from "@/lib/supabase/server";

type FincaRow = {
  fecha: string;
  finca: "LOTE4" | "VIRGINIA";
  label: string;
  stats: Stats;
};

const FINCAS = [
  ["LOTE4", "LOTE4"],
  ["VIRGINIA", "LA VIRGINIA"],
] as const;

export default async function TendenciaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("infraruts").select("*").order("cp");

  const infraruts: InfrarutRow[] = (data ?? []).map((r) => ({
    cp: r.cp,
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
      <div className="rounded-xl border bg-white p-6 text-sm text-neutral-500">
        Todavía no hay viajes de INFRARUT cargados — importalos desde Resumen.
      </div>
    );
  }

  const fechas = fechasUnicas(infraruts);

  const rows: FincaRow[] = [];
  for (const f of fechas) {
    for (const [clave, label] of FINCAS) {
      const v = porFincaFecha(infraruts, f, clave);
      if (!v.length) continue;
      const s = statsFor(v);
      if (s) rows.push({ fecha: f, finca: clave, label, stats: s });
    }
  }

  const l4map = new Map(
    rows.filter((r) => r.finca === "LOTE4").map((r) => [r.fecha, r.stats]),
  );
  const vamap = new Map(
    rows.filter((r) => r.finca === "VIRGINIA").map((r) => [r.fecha, r.stats]),
  );

  const rdtoData = fechas.map((f) => ({
    fecha: f.slice(5),
    LOTE4: l4map.get(f)?.rdto ?? null,
    VIRGINIA: vamap.get(f)?.rdto ?? null,
  }));
  const polData = fechas.map((f) => ({
    fecha: f.slice(5),
    LOTE4: l4map.get(f)?.pol ?? null,
    VIRGINIA: vamap.get(f)?.pol ?? null,
  }));
  const purezaData = fechas.map((f) => ({
    fecha: f.slice(5),
    LOTE4: l4map.get(f)?.pureza ?? null,
    VIRGINIA: vamap.get(f)?.pureza ?? null,
  }));

  // index_10.html:1240-1241 — escala dinámica para que ningún punto quede fuera del gráfico
  const rdtos = rows.map((r) => r.stats.rdto);
  const rdtoDomain: [number, number] = [
    Math.floor(Math.min(...rdtos, META) * 2) / 2 - 0.5,
    Math.ceil(Math.max(...rdtos, META) * 2) / 2 + 0.5,
  ];

  const prevByFinca = new Map<string, Stats>();

  return (
    <div className="space-y-6">
      <TendenciaCharts
        rdtoData={rdtoData}
        polData={polData}
        purezaData={purezaData}
        rdtoDomain={rdtoDomain}
      />

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-neutral-500">
              <th className="p-2 font-normal">Fecha</th>
              <th className="p-2 font-normal">Finca</th>
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
              const prev = prevByFinca.get(r.finca);
              const delta = prev ? r.stats.rdto - prev.rdto : null;
              prevByFinca.set(r.finca, r.stats);
              return (
                <tr key={`${r.fecha}-${r.finca}`} className="border-b last:border-0">
                  <td className="p-2">{r.fecha.slice(5)}</td>
                  <td className="p-2">
                    <span
                      className="mr-1.5 inline-block size-2 rounded-full"
                      style={{
                        backgroundColor:
                          r.finca === "LOTE4" ? "#378ADD" : "#1D9E75",
                      }}
                    />
                    {r.label}
                  </td>
                  <td className="p-2">{r.stats.n}</td>
                  <td className="p-2">{(r.stats.kg_neto / 1000).toFixed(1)}</td>
                  <td className="p-2">{r.stats.brix.toFixed(2)}</td>
                  <td className="p-2">{r.stats.pol.toFixed(2)}</td>
                  <td className="p-2">{r.stats.pureza.toFixed(2)}</td>
                  <td className="p-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.stats.rdto >= META
                          ? "bg-emerald-50 text-emerald-700"
                          : r.stats.rdto >= 9.5
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {r.stats.rdto.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-2">{r.stats.trash_pct.toFixed(2)}%</td>
                  <td className="p-2">
                    {r.stats.kg_azucar.toLocaleString("es-AR")}
                  </td>
                  <td className="p-2">
                    {delta !== null ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          delta >= 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {delta >= 0 ? "+" : ""}
                        {delta.toFixed(2)}pp
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
