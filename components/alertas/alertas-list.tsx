import {
  IconAlertCircle,
  IconCalendar,
  IconCalendarQuestion,
  IconChartLine,
  IconCircleCheck,
  IconDroplet,
  IconDropletOff,
  IconFileAlert,
  IconFileDownload,
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
  "file-download": IconFileDownload,
  "calendar-question": IconCalendarQuestion,
  "circle-check": IconCircleCheck,
};

const SEVERITY_CLASS: Record<Alert["severity"], string> = {
  bad: "border-l-red-600 bg-red-50 dark:bg-red-500/10 text-red-900 dark:text-red-200",
  warn: "border-l-amber-600 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200",
  info: "border-l-blue-600 bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-200",
};

const ICON_CLASS: Record<Alert["severity"], string> = {
  bad: "text-red-600 dark:text-red-400",
  warn: "text-amber-600 dark:text-amber-400",
  info: "text-blue-600 dark:text-blue-400",
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
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        Sin datos de INFRARUT cargados todavía — las alertas se calculan sobre esos
        datos (ver Resumen).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {desde && hasta && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
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
