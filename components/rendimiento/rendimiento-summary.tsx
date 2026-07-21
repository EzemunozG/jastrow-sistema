import { META } from "@/lib/business-rules";
import type { RendimientoTotal } from "@/lib/reconciliation";

export function RendimientoSummary({
  title,
  sub,
  total,
}: {
  title: string;
  sub: string;
  total: RendimientoTotal;
}) {
  const items: { lbl: string; val: string }[] = [
    { lbl: "Kg neto", val: total.kg_neto_total.toLocaleString("es-AR") },
    { lbl: "Tn/ha", val: total.tn_ha.toFixed(2) },
    { lbl: "Kg/surco", val: total.kg_surco.toFixed(2) },
    { lbl: "Rdto% promedio", val: `${total.rdto_promedio.toFixed(2)}%` },
  ];

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-neutral-400">{sub}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((it) => (
          <div key={it.lbl} className="min-w-[130px] flex-1 rounded-lg border p-3">
            <div className="text-xs text-neutral-500">{it.lbl}</div>
            <div
              className={`text-lg font-semibold ${
                it.lbl === "Rdto% promedio"
                  ? total.rdto_promedio >= META
                    ? "text-emerald-700"
                    : "text-red-700"
                  : ""
              }`}
            >
              {it.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
