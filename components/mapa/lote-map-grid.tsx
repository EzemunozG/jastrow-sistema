"use client";

import { useRef, useState } from "react";
import { Sprout } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber, formatPercent, formatTn } from "@/lib/format";
import type { ColorLote, LoteMapCard } from "@/lib/lot-map";

const CARD_STYLE: Record<ColorLote, string> = {
  verde:
    "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20",
  amarillo:
    "border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20",
  rojo: "border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20",
  "sin-cosecha": "border-border bg-muted hover:bg-accent",
};

const NUM_STYLE: Record<ColorLote, string> = {
  verde: "text-emerald-800 dark:text-emerald-300",
  amarillo: "text-amber-800 dark:text-amber-300",
  rojo: "text-red-800 dark:text-red-300",
  "sin-cosecha": "text-muted-foreground",
};

const RDTO_BADGE: Record<ColorLote, string> = {
  verde: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  amarillo: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
  rojo: "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300",
  "sin-cosecha": "bg-muted text-muted-foreground",
};

const LEYENDA: { color: ColorLote; label: string }[] = [
  { color: "verde", label: "Rdto ≥ 10%" },
  { color: "amarillo", label: "Rdto 9–10%" },
  { color: "rojo", label: "Rdto < 9%" },
  { color: "sin-cosecha", label: "Sin cosecha aún" },
];

const DOT: Record<ColorLote, string> = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-500",
  rojo: "bg-red-500",
  "sin-cosecha": "bg-muted-foreground/40",
};

// Relleno de la barra de avance (color sólido del estado; va bien en ambos temas).
const BAR_FILL: Record<ColorLote, string> = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-500",
  rojo: "bg-red-500",
  "sin-cosecha": "bg-muted-foreground/40",
};

const ALERT_DOT: Record<"bad" | "warn", string> = {
  bad: "bg-red-500",
  warn: "bg-amber-500",
};

// Banner de alerta en el detalle: fondo suave por severidad, con variante dark.
const ALERT_BANNER: Record<"bad" | "warn" | "info", string> = {
  bad: "border-l-red-500 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200",
  warn: "border-l-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200",
  info: "border-l-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200",
};

function usd(n: number): string {
  return `US$ ${formatNumber(n, 0)}`;
}

function Detalle({ lote }: { lote: LoteMapCard }) {
  const metrics: { lbl: string; val: string }[] = [
    {
      lbl: "Rdto promedio",
      val: lote.rdto_promedio != null ? formatPercent(lote.rdto_promedio) : "—",
    },
    { lbl: "Cosechado", val: formatTn(lote.cosechado_tn) },
    { lbl: "Rinde", val: lote.viajes > 0 ? `${formatNumber(lote.tn_ha, 1)} tn/ha` : "—" },
    {
      lbl: "Avance",
      val: lote.avance_pct != null ? formatPercent(lote.avance_pct, 0) : "—",
    },
    {
      lbl: "Viajes",
      val:
        lote.viajes_sin_pesaje > 0
          ? `${lote.viajes} (+${lote.viajes_sin_pesaje} s/pesaje)`
          : String(lote.viajes),
    },
    { lbl: "Gastado", val: lote.aplicaciones.length > 0 ? usd(lote.gastado_usd) : "—" },
  ];

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-base font-semibold">{lote.nombre}</h2>
        <p className="text-sm text-muted-foreground">
          {lote.ingenio_nombre
            ? `Cosechó: ${lote.ingenio_nombre}`
            : "Sin cosecha registrada esta zafra"}
          {" · "}
          {formatNumber(lote.ha)} ha
        </p>
        {(lote.contorno_nota || lote.solo_libreta) && (
          <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
            {lote.solo_libreta && (
              <p>
                Lote tomado de la libreta: todavía no está declarado en la tabla de
                lotes de cosecha, así que el nombre y las hectáreas salen de Campo →
                Lotes.
              </p>
            )}
            {lote.contorno_nota && <p>{lote.contorno_nota}</p>}
          </div>
        )}
      </div>

      {lote.alertas.length > 0 && (
        <div className="space-y-1.5">
          {lote.alertas.map((a, i) => (
            <div
              key={i}
              className={`rounded border-l-4 px-3 py-1.5 text-xs leading-relaxed ${ALERT_BANNER[a.severity]}`}
            >
              {a.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.lbl} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{m.lbl}</div>
            <div className="text-lg font-semibold">{m.val}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Aplicaciones</h3>
        {lote.aplicaciones.length === 0 ? (
          <EmptyState
            icon={Sprout}
            title="Sin aplicaciones vinculadas a este lote todavía"
            description="Cuando se carguen recetas o trabajos de este lote van a aparecer acá, con su costo en dólares."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-2 font-normal">Producto</th>
                  <th className="p-2 font-normal">Dosis / cantidad</th>
                  <th className="p-2 text-right font-normal">USD</th>
                </tr>
              </thead>
              <tbody>
                {lote.aplicaciones.map((a, i) => (
                  <tr
                    key={`${a.nombre}-${i}`}
                    className="border-b transition-colors last:border-0 hover:bg-muted"
                  >
                    <td className="p-2 font-medium">
                      {a.nombre}
                      {a.compartida && (
                        <span className="ml-1.5 inline-flex rounded-full bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 align-middle">
                          compartida
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground">{a.detalle}</td>
                    <td className="p-2 text-right">
                      {a.usd > 0 ? usd(a.usd) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted font-medium">
                  <td className="p-2" colSpan={2}>
                    Total · {usd(lote.usd_por_ha)}/ha
                  </td>
                  <td className="p-2 text-right">{usd(lote.gastado_usd)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {lote.aplicaciones.some((a) => a.compartida) && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Las recetas <span className="font-medium text-blue-700 dark:text-blue-300">compartidas</span>{" "}
            se aplicaron sobre varios lotes; el monto que se muestra es la parte
            prorrateada por hectárea que le toca a este lote.
          </p>
        )}
      </div>
    </div>
  );
}

export function LoteMapGrid({ cards }: { cards: LoteMapCard[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const detalleRef = useRef<HTMLDivElement>(null);
  const loteSel = cards.find((c) => c.lote_key === selected) ?? null;

  function seleccionar(key: string) {
    setSelected(key);
    // En mobile el panel queda abajo — lo traemos a la vista.
    requestAnimationFrame(() =>
      detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => {
          const activo = c.lote_key === selected;
          return (
            <button
              key={c.lote_key}
              type="button"
              onClick={() => seleccionar(c.lote_key)}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${CARD_STYLE[c.color]} ${
                activo ? "ring-2 ring-brand ring-offset-1" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {c.nombre}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {c.alerta_severidad && (
                    <span
                      className={`size-[9px] rounded-full ${ALERT_DOT[c.alerta_severidad]}`}
                      title="Este lote tiene alertas"
                    />
                  )}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${RDTO_BADGE[c.color]}`}
                  >
                    {c.rdto_promedio != null ? formatPercent(c.rdto_promedio, 1) : "s/d"}
                  </span>
                </div>
              </div>

              {c.viajes > 0 ? (
                <>
                  <div className={`text-2xl font-bold ${NUM_STYLE[c.color]}`}>
                    {formatNumber(c.tn_ha, 1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    tn/ha · {formatNumber(c.tn_surco, 2)} tn/surco
                  </div>
                  {c.viajes_sin_pesaje > 0 && (
                    <div
                      className="text-[11px] text-muted-foreground"
                      title="Despachos anotados en la libreta que el ingenio todavía no pesó: sus toneladas no están sumadas acá"
                    >
                      ({c.viajes_sin_pesaje} viaje
                      {c.viajes_sin_pesaje !== 1 ? "s" : ""} sin pesaje)
                    </div>
                  )}
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className={`h-full rounded-full ${BAR_FILL[c.color]}`}
                      style={{ width: `${c.avance_pct ?? 0}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {c.avance_pct != null
                      ? `${formatNumber(c.avance_pct, 0)}% cosechado · `
                      : ""}
                    {formatNumber(c.ha)} ha
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold text-muted-foreground">
                    {c.viajes_sin_pesaje > 0 ? "Sin pesaje aún" : "Sin cosecha aún"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.viajes_sin_pesaje > 0
                      ? `${c.viajes_sin_pesaje} viaje${c.viajes_sin_pesaje !== 1 ? "s" : ""} en libreta · `
                      : ""}
                    {formatNumber(c.ha)} ha
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="font-medium">Color por Rdto% vs meta 10%:</span>
        {LEYENDA.map((l) => (
          <span key={l.color} className="flex items-center gap-1.5">
            <span className={`inline-block size-2.5 rounded-full ${DOT[l.color]}`} />
            {l.label}
          </span>
        ))}
      </div>

      <div ref={detalleRef}>
        {loteSel ? (
          <Detalle lote={loteSel} />
        ) : (
          <div className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
            Tocá una tarjeta para ver el detalle del lote.
          </div>
        )}
      </div>
    </div>
  );
}
