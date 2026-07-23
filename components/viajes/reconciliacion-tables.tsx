import { FileSearch } from "lucide-react";
import {
  libretaStatus,
  reconciliar,
  type BajaArcaRow,
  type CpCampoRow,
  type LoteBreakdown,
  type RendimientoLote,
} from "@/lib/reconciliation";
import { META, fincaNombre, type InfrarutRow } from "@/lib/business-rules";
import { formatKg, formatNumber, formatPercent, formatTn } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

function RemitoList({
  label,
  remitos,
  className,
}: {
  label: string;
  remitos: (number | null)[];
  className: string;
}) {
  if (remitos.length === 0) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span className="text-neutral-500">{label}:</span>
      {remitos.map((r, i) => (
        <span key={r ?? `sin-remito-${i}`} className={`rounded px-1.5 py-0.5 font-medium ${className}`}>
          {r ?? "s/rem"}
        </span>
      ))}
    </div>
  );
}

export function ReconciliacionTables({
  title,
  cpsCampo,
  cpsCampoCompleto = cpsCampo,
  infraruts,
  bajas,
  porLote,
  rendimientoPorLote,
}: {
  title?: string;
  cpsCampo: CpCampoRow[];
  // Libreta completa del ingenio, SIN el filtro de lote — solo para decidir "sin
  // manual" (un INFRARUT sin lote asignable no puede atribuirse a ningún lote, así
  // que filtrar por lote no debe hacer que remitos de OTROS lotes aparezcan acá como
  // si no estuvieran en la libreta). Si no se pasa, se asume que `cpsCampo` ya viene
  // completo (caso sin filtro de lote).
  cpsCampoCompleto?: CpCampoRow[];
  infraruts: InfrarutRow[];
  bajas: BajaArcaRow[];
  porLote: LoteBreakdown[];
  rendimientoPorLote: RendimientoLote[];
}) {
  const { reconciliados, pendientes, infrarutPorRemito } = reconciliar(
    cpsCampo,
    infraruts,
    bajas,
  );

  // rendimientoPorLote trae una fila por cada lote con metadata, incluidos los sin
  // viajes reconciliados todavía (ver lib/reconciliation.ts) — acá solo interesan los
  // que ya tienen datos que mostrar.
  const rendimientoConDatos = rendimientoPorLote.filter((r) => r.n > 0);

  const cpsCampoSet = new Set(cpsCampoCompleto.map((x) => x.cp));
  const bajasSet = new Set(bajas.map((b) => b.cp));
  const sinManual = infraruts
    .filter((r) => libretaStatus(r, cpsCampoSet, bajasSet) === "sin_manual")
    .sort((a, b) => (a.remito ?? Infinity) - (b.remito ?? Infinity));

  if (cpsCampo.length === 0 && sinManual.length === 0) {
    return (
      <div className="space-y-4">
        {title && <h2 className="text-base font-semibold">{title}</h2>}
        <EmptyState
          icon={FileSearch}
          title="No hay viajes que coincidan con estos filtros"
          description="Probá ampliar el rango de fechas o cambiar el lote seleccionado."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && <h2 className="text-base font-semibold">{title}</h2>}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[130px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">Total libreta</div>
          <div className="text-lg font-semibold">{cpsCampo.length}</div>
          <div className="text-xs text-neutral-400">remitos del campo</div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">✅ Reconciliados</div>
          <div className="text-lg font-semibold text-emerald-700">
            {reconciliados.length}
          </div>
          <div className="text-xs text-neutral-400">confirmados por ingenio</div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">❌ Sin reconciliar</div>
          <div className="text-lg font-semibold text-red-700">
            {pendientes.length}
          </div>
          <div className="text-xs text-neutral-400">no están en INFRARUT</div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">⚠ Bajas ARCA</div>
          <div className="text-lg font-semibold text-amber-700">
            {bajas.length}
          </div>
          <div className="text-xs text-neutral-400">no deben aparecer</div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">❌ Sin manual</div>
          <div className="text-lg font-semibold text-orange-700">
            {sinManual.length}
          </div>
          <div className="text-xs text-neutral-400">INFRARUT sin libreta</div>
        </div>
      </div>

      {porLote.length > 0 && (
        <div className="space-y-2 rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold">Desglose por lote</h3>
          <p className="text-xs text-neutral-500">
            Según el lote de origen anotado en la libreta. Los INFRARUT sin
            registro manual no tienen lote asignable y van a “Sin lote”.
          </p>
          <div className="space-y-2">
            {porLote.map((g) => (
              <details key={g.lote} className="rounded-lg border">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <span className="text-sm font-semibold">{g.lote}</span>
                  <span className="text-xs text-emerald-700">
                    ✅ {g.reconciliados.length} reconciliados
                  </span>
                  <span className="text-xs text-red-700">
                    ❌ {g.reclamo.length} reclamo
                  </span>
                  <span className="text-xs text-orange-700">
                    ⚠ {g.sinManual.length} sin manual
                  </span>
                </summary>
                <div className="space-y-2 border-t px-3 py-2 text-xs">
                  <RemitoList
                    label="Reconciliados"
                    remitos={g.reconciliados.map((x) => x.cp)}
                    className="bg-emerald-50 text-emerald-700"
                  />
                  <RemitoList
                    label="Reclamo (sin reconciliar)"
                    remitos={g.reclamo.map((x) => x.cp)}
                    className="bg-red-50 text-red-700"
                  />
                  <RemitoList
                    label="Sin manual (INFRARUT sin libreta)"
                    remitos={g.sinManual.map((r) => r.remito)}
                    className="bg-orange-50 text-orange-700"
                  />
                  {g.reconciliados.length +
                    g.reclamo.length +
                    g.sinManual.length ===
                    0 && (
                    <p className="text-neutral-400">Sin viajes en este lote.</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {rendimientoConDatos.length > 0 && (
        <div className="space-y-2 rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold">Rendimiento por lote</h3>
          <p className="text-xs text-neutral-500">
            Kg neto y Rdto% medidos por el ingenio en los viajes reconciliados de
            cada lote, contra su hectareaje. Solo lotes con hectareaje cargado y al
            menos un viaje reconciliado.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-1 pr-3 font-normal">Lote</th>
                  <th className="py-1 pr-3 font-normal">Ha</th>
                  <th className="py-1 pr-3 font-normal">Surcos</th>
                  <th className="py-1 pr-3 font-normal">Viajes</th>
                  <th className="py-1 pr-3 font-normal">Kg neto</th>
                  <th className="py-1 pr-3 font-normal">Tn/ha</th>
                  <th className="py-1 pr-3 font-normal">Kg/surco</th>
                  <th className="py-1 pr-3 font-normal">Rdto%</th>
                </tr>
              </thead>
              <tbody>
                {rendimientoConDatos.map((r) => (
                  <tr
                    key={r.lote_key}
                    className="border-t transition-colors hover:bg-neutral-50"
                  >
                    <td className="py-1.5 pr-3 font-semibold">{r.nombre}</td>
                    <td className="py-1.5 pr-3">
                      {formatNumber(r.ha, r.ha % 1 ? 1 : 0)}
                    </td>
                    <td className="py-1.5 pr-3">
                      {formatNumber(Math.round(r.ha * r.surcos_por_ha))}
                    </td>
                    <td className="py-1.5 pr-3">{r.n}</td>
                    <td className="py-1.5 pr-3">{formatKg(r.kg_neto_total)}</td>
                    <td className="py-1.5 pr-3">{formatNumber(r.tn_ha, 2)}</td>
                    <td className="py-1.5 pr-3">{formatNumber(r.kg_surco, 2)}</td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          r.rdto_promedio >= META
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {formatPercent(r.rdto_promedio)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="space-y-2 rounded-xl border border-l-4 border-l-red-500 bg-white p-4">
          <h3 className="text-sm font-semibold text-red-700">
            Sin reconciliar — no aparecen en el INFRARUT ({pendientes.length})
          </h3>
          <p className="text-xs text-neutral-500">
            Estos remitos salieron del campo pero el ingenio no los reportó.
            Verificar si el INFRARUT correspondiente está pendiente de
            llegada o si hay que reclamar.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-1 pr-3 font-normal">Remito</th>
                  <th className="py-1 pr-3 font-normal">Fecha salida</th>
                  <th className="py-1 pr-3 font-normal">Matrícula / Camión</th>
                  <th className="py-1 pr-3 font-normal">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((x) => (
                  <tr
                    key={x.cp}
                    className="border-t bg-red-50/40 transition-colors hover:bg-red-50"
                  >
                    <td className="py-1.5 pr-3 text-sm font-bold text-red-700">
                      {x.cp}
                    </td>
                    <td className="py-1.5 pr-3">{x.fecha || "—"}</td>
                    <td className="py-1.5 pr-3">{x.camion || "—"}</td>
                    <td className="py-1.5 pr-3 text-neutral-500">
                      {x.obs || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sinManual.length > 0 && (
        <div className="space-y-2 rounded-xl border border-l-4 border-l-orange-500 bg-white p-4">
          <h3 className="text-sm font-semibold text-orange-700">
            Sin manual — INFRARUT sin registro en libreta ({sinManual.length})
          </h3>
          <p className="text-xs text-neutral-500">
            El ingenio reportó estos viajes pero el remito no está anotado en
            la libreta del campo. Falta cargar el despacho manual (o el
            INFRARUT vino sin número de remito).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-1 pr-3 font-normal">Remito</th>
                  <th className="py-1 pr-3 font-normal">CP ingenio</th>
                  <th className="py-1 pr-3 font-normal">Fecha INFRARUT</th>
                  <th className="py-1 pr-3 font-normal">Finca</th>
                  <th className="py-1 pr-3 font-normal">Kg neto</th>
                  <th className="py-1 pr-3 font-normal">Rdto%</th>
                </tr>
              </thead>
              <tbody>
                {sinManual.map((r) => (
                  <tr
                    key={r.cp}
                    className="border-t bg-orange-50/40 transition-colors hover:bg-orange-50"
                  >
                    <td className="py-1.5 pr-3 text-sm font-bold text-orange-700">
                      {r.remito ?? "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-neutral-500">{r.cp}</td>
                    <td className="py-1.5 pr-3">{r.fecha.slice(5)}</td>
                    <td className="py-1.5 pr-3">{fincaNombre(r.finca_id)}</td>
                    <td className="py-1.5 pr-3">{formatTn(r.kg_neto / 1000)}</td>
                    <td className="py-1.5 pr-3">{formatPercent(r.rdto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-2 rounded-xl border border-l-4 border-l-emerald-500 bg-white p-4">
        <h3 className="text-sm font-semibold text-emerald-700">
          Reconciliados — confirmados por el ingenio ({reconciliados.length})
        </h3>
        {reconciliados.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-1 pr-3 font-normal">Remito</th>
                  <th className="py-1 pr-3 font-normal">Fecha campo</th>
                  <th className="py-1 pr-3 font-normal">Fecha INFRARUT</th>
                  <th className="py-1 pr-3 font-normal">Finca</th>
                  <th className="py-1 pr-3 font-normal">Rdto%</th>
                  <th className="py-1 pr-3 font-normal">Kg neto</th>
                  <th className="py-1 pr-3 font-normal">Kg azúcar</th>
                </tr>
              </thead>
              <tbody>
                {reconciliados.map((x) => {
                  const inf = infrarutPorRemito.get(x.cp);
                  return (
                    <tr
                      key={x.cp}
                      className="border-t transition-colors hover:bg-neutral-50"
                    >
                      <td className="py-1.5 pr-3 font-semibold text-emerald-700">
                        {x.cp}
                      </td>
                      <td className="py-1.5 pr-3">{x.fecha || "—"}</td>
                      <td className="py-1.5 pr-3">
                        {inf?.fecha?.slice(5) || "—"}
                      </td>
                      <td className="py-1.5 pr-3">
                        {inf ? fincaNombre(inf.finca_id) : "—"}
                      </td>
                      <td className="py-1.5 pr-3">
                        {inf ? (
                          <span
                            className={`rounded-full px-2 py-0.5 font-medium ${
                              inf.rdto >= META
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {formatPercent(inf.rdto)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        {inf ? formatTn(inf.kg_neto / 1000) : "—"}
                      </td>
                      <td className="py-1.5 pr-3">
                        {inf ? formatKg(inf.kg_azucar) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-neutral-400">
            Todavía no hay remitos reconciliados. Cargá los INFRARUTs
            correspondientes para empezar a cruzar.
          </p>
        )}
      </div>
    </div>
  );
}
