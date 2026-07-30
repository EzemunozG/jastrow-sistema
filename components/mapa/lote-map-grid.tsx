"use client";

import { useRef, useState } from "react";
import { Sprout } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber, formatPercent, formatTn } from "@/lib/format";
import type { ColorLote, LoteMapCard } from "@/lib/lot-map";

const CARD_STYLE: Record<ColorLote, string> = {
  verde: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100",
  amarillo: "border-amber-200 bg-amber-50 hover:bg-amber-100",
  rojo: "border-red-200 bg-red-50 hover:bg-red-100",
  "sin-cosecha": "border-neutral-200 bg-neutral-50 hover:bg-neutral-100",
};

const NUM_STYLE: Record<ColorLote, string> = {
  verde: "text-emerald-800",
  amarillo: "text-amber-800",
  rojo: "text-red-800",
  "sin-cosecha": "text-neutral-400",
};

const RDTO_BADGE: Record<ColorLote, string> = {
  verde: "bg-emerald-100 text-emerald-800",
  amarillo: "bg-amber-100 text-amber-800",
  rojo: "bg-red-100 text-red-800",
  "sin-cosecha": "bg-neutral-100 text-neutral-500",
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
  "sin-cosecha": "bg-neutral-300",
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
    { lbl: "Viajes", val: String(lote.viajes) },
    { lbl: "Gastado", val: lote.aplicaciones.length > 0 ? usd(lote.gastado_usd) : "—" },
  ];

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div>
        <h2 className="text-base font-semibold">{lote.nombre}</h2>
        <p className="text-sm text-neutral-500">
          {lote.ingenio_nombre
            ? `Cosechó: ${lote.ingenio_nombre}`
            : "Sin cosecha registrada esta zafra"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.lbl} className="rounded-lg border p-3">
            <div className="text-xs text-neutral-500">{m.lbl}</div>
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
                <tr className="border-b text-left text-xs text-neutral-500">
                  <th className="p-2 font-normal">Producto</th>
                  <th className="p-2 font-normal">Dosis / cantidad</th>
                  <th className="p-2 text-right font-normal">USD</th>
                </tr>
              </thead>
              <tbody>
                {lote.aplicaciones.map((a, i) => (
                  <tr
                    key={`${a.nombre}-${i}`}
                    className="border-b transition-colors last:border-0 hover:bg-neutral-50"
                  >
                    <td className="p-2 font-medium">{a.nombre}</td>
                    <td className="p-2 text-neutral-600">{a.detalle}</td>
                    <td className="p-2 text-right">
                      {a.usd > 0 ? usd(a.usd) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-neutral-50 font-medium">
                  <td className="p-2" colSpan={2}>
                    Total · {usd(lote.usd_por_ha)}/ha
                  </td>
                  <td className="p-2 text-right">{usd(lote.gastado_usd)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
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
                activo ? "ring-2 ring-[#0F4C2B] ring-offset-1" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-neutral-800">
                  {c.nombre}
                </span>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${RDTO_BADGE[c.color]}`}
                >
                  {c.rdto_promedio != null ? formatPercent(c.rdto_promedio, 1) : "s/d"}
                </span>
              </div>

              {c.viajes > 0 ? (
                <>
                  <div className={`text-2xl font-bold ${NUM_STYLE[c.color]}`}>
                    {formatNumber(c.tn_surco, 2)}
                  </div>
                  <div className="text-xs text-neutral-500">
                    tn/surco · {formatNumber(c.ha)} ha
                  </div>
                  {c.parcial && (
                    <span className="mt-0.5 inline-flex w-fit rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                      cosecha en curso · parcial
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold text-neutral-400">
                    Sin cosecha aún
                  </div>
                  <div className="text-xs text-neutral-400">
                    {formatNumber(c.ha)} ha
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500">
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
          <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-neutral-400">
            Tocá una tarjeta para ver el detalle del lote.
          </div>
        )}
      </div>
    </div>
  );
}
