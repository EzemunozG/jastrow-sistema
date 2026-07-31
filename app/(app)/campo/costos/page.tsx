export const dynamic = "force-dynamic";

import { AppSettingsForm } from "@/components/campo/app-settings-form";
import {
  PESO_BOLSA,
  calcularArriendo,
  costoPorCategoria,
  costoPorLote,
} from "@/lib/costos";
import { createClient } from "@/lib/supabase/server";
import { formatMoney as fmtMonto } from "@/lib/format";

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="min-w-[130px] flex-1 rounded-xl border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default async function CostosPage() {
  const supabase = await createClient();
  const [
    { data: lotes },
    { data: trabajos },
    { data: settings },
    { data: infraruts },
  ] = await Promise.all([
    supabase.from("lotes").select("*").order("id"),
    supabase.from("trabajos").select("*"),
    supabase.from("app_settings").select("*").eq("id", 1).single(),
    supabase.from("infraruts").select("*").eq("ingenio_id", "concepcion"),
  ]);

  const lotesData = lotes ?? [];
  const trabajosData = trabajos ?? [];
  const infrarutsData = infraruts ?? [];
  const appSettings = settings ?? {
    id: 1,
    precio_bolsa: 0,
    tc_oficial: 0,
    tc_blue: 0,
    tc_ccl: 0,
    rinde_esperado_tn_ha: 70,
    updated_at: new Date().toISOString(),
  };

  const totalHa = lotesData.reduce((s, l) => s + l.ha, 0);
  const totalCostosTrabajos = trabajosData.reduce(
    (s, t) => s + (t.costo_total || 0),
    0,
  );
  const totalKgAzucar = infrarutsData.reduce(
    (s, r) => s + (r.kg_azucar || 0),
    0,
  );

  const { totalBolsas, totalArrPesos } = calcularArriendo(
    lotesData,
    appSettings.precio_bolsa,
  );
  const lotesArr = lotesData.filter(
    (l) => l.tipo === "Arrendado" && (l.arriendo ?? 0) > 0,
  );

  const infrarutsForCosto = infrarutsData.map((r) => ({
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

  const totalCostos = totalCostosTrabajos + totalArrPesos;
  const costoTotalPorKgAzucar =
    totalCostos > 0 && totalKgAzucar > 0
      ? totalCostos / totalKgAzucar
      : null;

  const byCategoria = [...costoPorCategoria(trabajosData).entries()].sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">
          Precio de la bolsa de azúcar (50 kg)
        </h2>
        <AppSettingsForm settings={appSettings} />
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">
          Arriendo — pagado en bolsas de azúcar/ha/año
        </h2>
        <div className="flex flex-wrap gap-3">
          <StatTile
            label="Ha arrendadas con valor"
            value={`${lotesArr.reduce((s, l) => s + l.ha, 0)} ha`}
            sub={`${lotesArr.length} lotes configurados`}
          />
          <StatTile
            label="Total bolsas/año"
            value={totalBolsas.toLocaleString("es-AR", {
              maximumFractionDigits: 0,
            })}
            sub="bolsas de 50 kg"
          />
          <StatTile
            label="Total kg azúcar/año"
            value={`${((totalBolsas * PESO_BOLSA) / 1000).toFixed(1)} t`}
            sub="en concepto de arriendo"
          />
          <StatTile
            label="Costo arriendo en $"
            value={
              totalArrPesos > 0
                ? fmtMonto(totalArrPesos)
                : "Ingresá el precio de la bolsa"
            }
            sub={
              appSettings.precio_bolsa > 0
                ? `${fmtMonto(appSettings.precio_bolsa)}/bolsa`
                : undefined
            }
          />
        </div>

        {lotesArr.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3 font-normal">Lote</th>
                  <th className="py-1 pr-3 font-normal">Propietario</th>
                  <th className="py-1 pr-3 font-normal">Ha</th>
                  <th className="py-1 pr-3 font-normal">Bolsas/ha</th>
                  <th className="py-1 pr-3 font-normal">Total bolsas</th>
                  <th className="py-1 pr-3 font-normal">Total kg azúcar</th>
                  <th className="py-1 pr-3 font-normal">Equiv. $</th>
                  <th className="py-1 pr-3 font-normal">Condición</th>
                </tr>
              </thead>
              <tbody>
                {lotesArr.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="py-1.5 pr-3 font-medium">{l.id}</td>
                    <td className="py-1.5 pr-3">{l.propietario || "—"}</td>
                    <td className="py-1.5 pr-3">{l.ha}</td>
                    <td className="py-1.5 pr-3 font-medium text-amber-700 dark:text-amber-300">
                      {l.arriendo}
                    </td>
                    <td className="py-1.5 pr-3">
                      {((l.arriendo ?? 0) * l.ha).toLocaleString("es-AR")}
                    </td>
                    <td className="py-1.5 pr-3">
                      {(((l.arriendo ?? 0) * l.ha * PESO_BOLSA) / 1000).toFixed(
                        1,
                      )}{" "}
                      t
                    </td>
                    <td className="py-1.5 pr-3">
                      {appSettings.precio_bolsa > 0
                        ? fmtMonto(
                            (l.arriendo ?? 0) * l.ha * appSettings.precio_bolsa,
                          )
                        : "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">
                      {l.arriendo_obs || "Pago único anual"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Editá los lotes arrendados y cargá las bolsas/ha para calcular el
            arriendo.
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">
          Resumen global — todos los lotes
        </h2>
        <div className="flex flex-wrap gap-3">
          <StatTile
            label="Costo trabajos registrado"
            value={fmtMonto(totalCostosTrabajos)}
            sub={`${trabajosData.length} trabajos`}
          />
          <StatTile
            label="Costo arriendo equiv."
            value={totalArrPesos > 0 ? fmtMonto(totalArrPesos) : "—"}
            sub={`${totalBolsas.toLocaleString("es-AR")} bolsas`}
          />
          <StatTile
            label="Kg azúcar producidos"
            value={`${(totalKgAzucar / 1000).toFixed(1)} t`}
            sub="del INFRARUT"
          />
          <StatTile
            label="Costo total / kg azúcar"
            value={
              costoTotalPorKgAzucar !== null
                ? `$${costoTotalPorKgAzucar.toFixed(2)}`
                : "—"
            }
            sub="trabajos + arriendo"
          />
        </div>

        {byCategoria.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3 font-normal">Tipo de trabajo</th>
                  <th className="py-1 pr-3 font-normal">Costo total</th>
                  <th className="py-1 pr-3 font-normal">% del total</th>
                  <th className="py-1 pr-3 font-normal">Costo/ha</th>
                </tr>
              </thead>
              <tbody>
                {byCategoria.map(([tipo, monto]) => (
                  <tr key={tipo} className="border-t">
                    <td className="py-1.5 pr-3 font-medium">{tipo}</td>
                    <td className="py-1.5 pr-3">{fmtMonto(monto)}</td>
                    <td className="py-1.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{
                              width: `${((monto / totalCostosTrabajos) * 100).toFixed(0)}%`,
                            }}
                          />
                        </div>
                        <span>
                          {((monto / totalCostosTrabajos) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 pr-3">
                      {totalHa > 0 ? `${fmtMonto(monto / totalHa)}/ha` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Cargá trabajos en los lotes para ver la distribución de costos.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Costo por lote</h2>
        <div className="space-y-3">
          {lotesData.map((l) => {
            const { costo, kgAzucar, tnCana, costoPorKgAzucar: cxkg } =
              costoPorLote(l, trabajosData, infrarutsForCosto);
            const costoPorHa = costo > 0 && l.ha > 0 ? costo / l.ha : null;
            const trabLote = trabajosData.filter((t) => t.lote_id === l.id);
            return (
              <div key={l.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">
                      {l.id} — {l.nombre || ""}{" "}
                      <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                        {l.estado}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l.ha} ha · {l.tipo} · {l.variedad || "—"} · {l.soca}ª
                      soca
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-center text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Costo total
                      </div>
                      <div className="font-semibold text-amber-700 dark:text-amber-300">
                        {costo > 0 ? fmtMonto(costo) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">$/ha</div>
                      <div className="font-semibold">
                        {costoPorHa !== null ? fmtMonto(costoPorHa) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Tn caña</div>
                      <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {tnCana > 0 ? tnCana.toFixed(1) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Kg azúcar
                      </div>
                      <div className="font-semibold text-amber-600 dark:text-amber-400">
                        {kgAzucar > 0
                          ? kgAzucar.toLocaleString("es-AR")
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        $/kg azúcar
                      </div>
                      <div className="font-semibold text-blue-700 dark:text-blue-300">
                        {cxkg !== null ? `$${cxkg.toFixed(2)}` : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {trabLote.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sin trabajos registrados en este lote.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
