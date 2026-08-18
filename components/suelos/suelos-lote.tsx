import { FlaskConical } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatFecha, formatNumber } from "@/lib/format";
import {
  anclaLote,
  ESTADO_PLANIFICADO,
  MG_CIC_BAJO_PCT,
  MO_BAJO_PCT,
  N_INSUFICIENTE_PCT,
  P_LIGERA_MAX_PPM,
  P_LIGERA_MIN_PPM,
  PH_OPTIMO_MAX,
  PH_OPTIMO_MIN,
  TOLERANCIA_TOTAL_KG,
  type AnalisisEvaluado,
  type EvalSuelo,
  type LoteSuelo,
  type NivelSuelo,
} from "@/lib/suelo";

const CHIP: Record<NivelSuelo, string> = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  warn: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  bad: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  sd: "bg-muted text-muted-foreground",
};

const ESTADO_CHIP: Record<string, string> = {
  planificado: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  aplicado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  cancelado: "bg-muted text-muted-foreground",
};

// Valor + chip del semáforo en la misma celda: el número solo no dice nada si no se
// sabe contra qué rango se lo está comparando.
function Celda({
  val,
  e,
}: {
  val: number | null | undefined;
  e: EvalSuelo;
}) {
  return (
    <td className="p-2.5 whitespace-nowrap">
      <span className="font-medium">
        {val != null ? formatNumber(val, val < 1 ? 3 : 2) : "—"}
      </span>{" "}
      <span
        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CHIP[e.nivel]}`}
      >
        {e.etiqueta}
      </span>
    </td>
  );
}

function AnalisisTable({ analisis }: { analisis: AnalisisEvaluado[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="p-2.5 font-normal">Fecha</th>
            <th className="p-2.5 font-normal">Sector</th>
            <th className="p-2.5 font-normal">Prof.</th>
            <th className="p-2.5 font-normal">Laboratorio</th>
            <th className="p-2.5 font-normal">pH</th>
            <th className="p-2.5 font-normal">MO %</th>
            <th className="p-2.5 font-normal">N total %</th>
            <th className="p-2.5 font-normal">P ppm</th>
            <th className="p-2.5 font-normal">Mg % de CIC</th>
          </tr>
        </thead>
        <tbody>
          {analisis.map((a) => (
            <tr key={a.id} className="border-b transition-colors last:border-0 hover:bg-muted">
              <td className="p-2.5 whitespace-nowrap">{formatFecha(a.fecha)}</td>
              <td className="p-2.5">{a.sector ?? "todo el lote"}</td>
              <td className="p-2.5 text-muted-foreground">{a.profundidad ?? "—"}</td>
              <td className="p-2.5 text-muted-foreground">
                {a.laboratorio ?? "—"}
                {a.informe_nro && (
                  <span className="block text-[11px]">Informe {a.informe_nro}</span>
                )}
              </td>
              <Celda val={a.ph} e={a.evaluacion.ph} />
              <Celda val={a.mo_pct} e={a.evaluacion.mo} />
              <Celda val={a.n_total_pct} e={a.evaluacion.n} />
              <Celda val={a.p_ppm} e={a.evaluacion.p} />
              <Celda val={a.mg_pct_cic} e={a.evaluacion.mg} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanTable({ lote }: { lote: LoteSuelo }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="p-2.5 font-normal">Producto</th>
            <th className="p-2.5 text-right font-normal">Dosis kg/surco</th>
            <th className="p-2.5 text-right font-normal">Total kg</th>
            <th className="p-2.5 font-normal">Cuenta con los surcos del sistema</th>
            <th className="p-2.5 font-normal">Ventana</th>
            <th className="p-2.5 font-normal">Estado</th>
          </tr>
        </thead>
        <tbody>
          {lote.plan.map((p) => (
            <tr key={p.id} className="border-b align-top transition-colors last:border-0 hover:bg-muted">
              <td className="p-2.5 font-medium">
                {p.producto ?? "—"}
                {p.campania && (
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    campaña {p.campania}
                  </span>
                )}
              </td>
              <td className="p-2.5 text-right whitespace-nowrap">
                {p.dosis_kg_surco != null ? formatNumber(p.dosis_kg_surco, 2) : "—"}
              </td>
              <td className="p-2.5 text-right font-semibold whitespace-nowrap">
                {p.total_kg != null ? `${formatNumber(p.total_kg, 0)} kg` : "—"}
              </td>
              <td className="p-2.5 text-xs">
                {p.chequeo.total_calculado != null ? (
                  <>
                    <span className="text-muted-foreground">
                      {formatNumber(p.dosis_kg_surco ?? 0, 2)} ×{" "}
                      {formatNumber(Math.round(p.chequeo.surcos ?? 0))} surcos ={" "}
                    </span>
                    <span className="font-medium">
                      {formatNumber(p.chequeo.total_calculado, 0)} kg
                    </span>
                    {p.chequeo.advertencia && (
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CHIP.warn}`}>
                          revisar surcos del lote
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatNumber(p.chequeo.desvio_pct ?? 0, 0)}% de diferencia
                        </span>
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    sin ha/surcos cargados para este lote
                  </span>
                )}
              </td>
              <td className="p-2.5 text-muted-foreground">{p.ventana ?? "—"}</td>
              <td className="p-2.5">
                <span
                  className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    ESTADO_CHIP[p.estado] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SuelosLote({ lote }: { lote: LoteSuelo }) {
  const pendientes = lote.plan.filter((p) => p.estado === ESTADO_PLANIFICADO).length;

  return (
    <section id={anclaLote(lote.lote_key)} className="scroll-mt-20 space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold">{lote.nombre}</h2>
        <span className="text-xs text-muted-foreground">
          {lote.ha != null
            ? `${formatNumber(lote.ha)} ha · ${formatNumber(
                Math.round(lote.ha * (lote.surcos_por_ha ?? 0)),
              )} surcos`
            : "sin hectáreas cargadas"}
          {pendientes > 0 &&
            (pendientes === 1
              ? " · 1 fertilización pendiente"
              : ` · ${pendientes} fertilizaciones pendientes`)}
        </span>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-medium">Análisis de suelo</h3>
        {lote.analisis.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sin análisis cargados para este lote.
          </p>
        ) : (
          <AnalisisTable analisis={lote.analisis} />
        )}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-medium">Plan de fertilización</h3>
        {lote.plan.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sin plan de fertilización cargado para este lote.
          </p>
        ) : (
          <PlanTable lote={lote} />
        )}
      </div>
    </section>
  );
}

export function SuelosEmpty() {
  return (
    <EmptyState
      icon={FlaskConical}
      title="Todavía no hay análisis de suelo ni planes de fertilización cargados"
      description="Cuando se carguen, cada lote va a aparecer acá con su semáforo de pH, materia orgánica, nitrógeno, fósforo y magnesio, y debajo su plan de fertilización."
    />
  );
}

// Leyenda de los rangos: el semáforo no sirve de nada si hay que adivinar contra qué
// se está comparando. Los números salen de las constantes de lib/suelo.ts, así que si
// se ajusta un umbral la leyenda se ajusta sola.
export function LeyendaRangos() {
  const items = [
    `pH óptimo ${formatNumber(PH_OPTIMO_MIN, 1)}–${formatNumber(PH_OPTIMO_MAX, 1)}`,
    `MO bajo < ${formatNumber(MO_BAJO_PCT, 1)}%`,
    `N insuficiente < ${formatNumber(N_INSUFICIENTE_PCT, 3)}%`,
    `P ligera insuficiencia ${P_LIGERA_MIN_PPM}–${P_LIGERA_MAX_PPM} ppm (por debajo, insuficiente)`,
    `Mg bajo si Mg/CIC < ${formatNumber(MG_CIC_BAJO_PCT, 1)}%`,
  ];
  return (
    <div className="space-y-1 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Rangos de referencia para caña</p>
      <p>{items.join(" · ")}</p>
      <p>
        La cuenta al lado del total del plan usa los surcos del sistema (ha ×
        surcos/ha de la tabla de lotes). Si difiere más de{" "}
        {formatNumber(TOLERANCIA_TOTAL_KG * 100, 0)}% del total cargado, se marca
        &ldquo;revisar surcos del lote&rdquo; — el total del plan no se recalcula, se
        muestra tal como vino.
      </p>
    </div>
  );
}
