export const dynamic = "force-dynamic";

import { InfrarutsImportForm } from "@/components/resumen/infraruts-import-form";
import {
  RdtoViajeChart,
  type RdtoViajePoint,
} from "@/components/resumen/rdto-viaje-chart";
import { META, avg, statsFor, sum, type InfrarutRow } from "@/lib/business-rules";
import { getCurrentProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

function kpiClass(cls: "ok" | "warn" | "bad" | "info") {
  return {
    ok: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-red-700",
    info: "text-blue-700",
  }[cls];
}

function FincaCard({
  stats,
  nombre,
  color,
}: {
  stats: ReturnType<typeof statsFor>;
  nombre: string;
  color: string;
}) {
  if (!stats) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-neutral-400">
        Sin datos de {nombre}
      </div>
    );
  }
  const rows: [string, string, boolean][] = [
    ["Viajes", String(stats.n), false],
    ["Tn netas", (stats.kg_neto / 1000).toFixed(1), false],
    ["Kg azúcar", stats.kg_azucar.toLocaleString("es-AR"), false],
    ["Brix%", stats.brix.toFixed(2), false],
    ["POL%", stats.pol.toFixed(2), stats.pol < 15],
    ["Pureza%", stats.pureza.toFixed(2), stats.pureza < 85],
    ["Trash%", `${stats.trash_pct.toFixed(2)}%`, stats.trash_pct > 10],
  ];
  return (
    <div className="space-y-2 rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          {nombre}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            stats.rdto >= META
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          Rdto. {stats.rdto.toFixed(2)}%
        </span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value, warn]) => (
            <tr key={label} className="border-t">
              <td className="py-1 text-neutral-500">{label}</td>
              <td
                className={`py-1 text-right font-medium ${warn ? "text-amber-700" : ""}`}
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ResumenPage() {
  const { profile } = await getCurrentProfile();
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

  const fechas = [...new Set(infraruts.map((r) => r.fecha))].sort();
  const lastFecha = fechas[fechas.length - 1];

  const l4tot = statsFor(infraruts.filter((r) => r.finca_id === "LOTE4"));
  const vatot = statsFor(infraruts.filter((r) => r.finca_id !== "LOTE4"));

  // index_10.html:1189-1208 (drawRdto) — barras por viaje del último día, orden por CP.
  const rdtoViaje: RdtoViajePoint[] = infraruts
    .filter((r) => r.fecha === lastFecha)
    .sort((a, b) => a.cp - b.cp)
    .map((r) => ({
      cp: String(r.cp),
      LOTE4: r.finca_id === "LOTE4" ? r.rdto : null,
      VIRGINIA: r.finca_id !== "LOTE4" ? r.rdto : null,
    }));

  const rdtoTot = avg(infraruts, (r) => r.rdto);
  const polTot = avg(infraruts, (r) => r.pol);
  const totTn = sum(infraruts, (r) => r.kg_neto) / 1000;
  const totAz = sum(infraruts, (r) => r.kg_azucar);

  const kpis: {
    lbl: string;
    val: string;
    sub: string;
    cls: "ok" | "warn" | "bad" | "info";
  }[] = [
    {
      lbl: "Rdto% promedio",
      val: `${rdtoTot.toFixed(2)}%`,
      sub: "meta: 10.0%",
      cls: rdtoTot >= META ? "ok" : rdtoTot >= 9.5 ? "warn" : "bad",
    },
    {
      lbl: "POL% promedio",
      val: `${polTot.toFixed(2)}%`,
      sub: "referencia: >15%",
      cls: polTot >= 15 ? "ok" : polTot >= 14 ? "warn" : "bad",
    },
    {
      lbl: "Tn caña total",
      val: totTn.toFixed(1),
      sub: "tn netas acumuladas",
      cls: "info",
    },
    {
      lbl: "Kg azúcar total",
      val: totAz.toLocaleString("es-AR"),
      sub: "producidos en total",
      cls: rdtoTot >= META ? "ok" : "warn",
    },
    {
      lbl: "Viajes totales",
      val: String(infraruts.length),
      sub: "cargados al sistema",
      cls: "info",
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">
        <i className="mr-1" />
        Total acumulado: <strong>{fechas.length} día(s)</strong>
        {fechas.length > 0 && (
          <>
            {" "}
            &nbsp;·&nbsp; {fechas[0]} → {lastFecha}
          </>
        )}
      </p>

      {profile.role === "admin" && <InfrarutsImportForm />}

      {infraruts.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-neutral-500">
          Todavía no hay viajes de INFRARUT cargados
          {profile.role === "admin"
            ? " — usá el importador de arriba."
            : "."}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {kpis.map((k) => (
              <div
                key={k.lbl}
                className="min-w-[150px] flex-1 rounded-xl border bg-white p-3"
              >
                <div className="text-xs text-neutral-500">{k.lbl}</div>
                <div className={`text-lg font-semibold ${kpiClass(k.cls)}`}>
                  {k.val}
                </div>
                <div className="text-xs text-neutral-400">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FincaCard stats={l4tot} nombre="LOTE4" color="#378ADD" />
            <FincaCard stats={vatot} nombre="LA VIRGINIA" color="#1D9E75" />
          </div>

          <div className="rounded-xl border bg-white p-4">
            <h3 className="mb-3 text-sm font-medium">
              Rdto% por viaje — último día cargado ({lastFecha})
            </h3>
            <RdtoViajeChart data={rdtoViaje} />
          </div>
        </>
      )}
    </div>
  );
}
