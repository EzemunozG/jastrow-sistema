import {
  IconAlertCircle,
  IconCalendar,
  IconChartLine,
  IconCircleCheck,
  IconDroplet,
  IconDropletOff,
  IconFileAlert,
  IconFileUpload,
  IconFileX,
  IconLeaf,
  IconNotebook,
  IconTrendingDown,
} from "@tabler/icons-react";
import type { Alert } from "@/lib/alerts";

const ICONS: Record<string, typeof IconAlertCircle> = {
  "trending-down": IconTrendingDown,
  "alert-circle": IconAlertCircle,
  "droplet-off": IconDropletOff,
  droplet: IconDroplet,
  leaf: IconLeaf,
  "file-alert": IconFileAlert,
  "file-x": IconFileX,
  notebook: IconNotebook,
  "chart-line": IconChartLine,
  "file-upload": IconFileUpload,
  "circle-check": IconCircleCheck,
};

const SEVERITY_CLASS: Record<Alert["severity"], string> = {
  bad: "border-l-red-600 bg-red-50 text-red-900",
  warn: "border-l-amber-600 bg-amber-50 text-amber-900",
  info: "border-l-blue-600 bg-blue-50 text-blue-900",
};

const ICON_CLASS: Record<Alert["severity"], string> = {
  bad: "text-red-600",
  warn: "text-amber-600",
  info: "text-blue-600",
};

// index_10.html:3113-3190 (renderAlertas) — mismo orden y umbrales, ver lib/alerts.ts.
export function AlertasList({
  alerts,
  desde,
  hasta,
}: {
  alerts: Alert[];
  desde: string | null;
  hasta: string | null;
}) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-6 text-center text-sm text-neutral-400">
        Sin datos de INFRARUT cargados todavía — las alertas se calculan sobre esos
        datos (ver Resumen).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {desde && hasta && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
          <IconCalendar size={13} />
          Análisis acumulado — {desde} al {hasta} · generado automáticamente
        </div>
      )}
      <div className="space-y-2">
        {alerts.map((a, i) => {
          const Icon = ICONS[a.icon] ?? IconAlertCircle;
          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 rounded-lg border-l-4 px-3.5 py-2.5 text-sm leading-relaxed ${SEVERITY_CLASS[a.severity]}`}
            >
              <Icon size={17} className={`mt-0.5 shrink-0 ${ICON_CLASS[a.severity]}`} />
              <div>{a.message}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
