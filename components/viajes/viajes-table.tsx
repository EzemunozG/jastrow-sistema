"use client";

import { Fragment, useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import {
  META,
  contarSinFecha,
  fechasUnicas,
  fincaNombre,
  type InfrarutRow,
} from "@/lib/business-rules";
import { formatFechaCorta, formatKg, formatPercent, formatTn } from "@/lib/format";
import { detectarBrechas, libretaStatus } from "@/lib/reconciliation";
import { useSort } from "@/hooks/use-sort";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SortButton } from "@/components/ui/sortable-th";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortKey =
  | "remito"
  | "cp"
  | "fecha"
  | "finca"
  | "veh"
  | "maq"
  | "kg_neto"
  | "trash_pct"
  | "brix"
  | "pol"
  | "pureza"
  | "rdto"
  | "kg_azucar"
  | "libreta";

function trashPctOf(r: InfrarutRow): number | null {
  return r.kg_trash > 0 ? (r.kg_trash / (r.kg_neto + r.kg_trash)) * 100 : null;
}

export function ViajesTable({
  infraruts,
  cpsCampo,
  bajas,
  filtrosActivos,
}: {
  infraruts: InfrarutRow[];
  cpsCampo: number[];
  bajas: number[];
  filtrosActivos: boolean;
}) {
  const [showGaps, setShowGaps] = useState(false);

  const cpsCampoSet = useMemo(() => new Set(cpsCampo), [cpsCampo]);
  const bajasSet = useMemo(() => new Set(bajas), [bajas]);
  // detectarBrechas ya devuelve las brechas ordenadas por faltantes desc, con
  // `probable` precalculado (index_10.html:1912) — ver lib/reconciliation.ts. Se
  // calcula sobre los viajes ya filtrados (por fecha/ingenio/lote/búsqueda), así que
  // refleja lo que se está mirando, no el total del sistema.
  const bigGaps = useMemo(() => detectarBrechas(infraruts), [infraruts]);
  // Viajes confirmados por el ingenio cuya fecha de salida todavía no se transcribió
  // de la libreta: se listan igual (y suman en todo), solo que sin día asignable.
  const sinFecha = contarSinFecha(infraruts);

  const rem = (r: InfrarutRow) => r.remito ?? Number.MAX_SAFE_INTEGER;
  const remitos = useMemo(
    () =>
      infraruts
        .filter((r) => r.remito != null)
        .map((r) => r.remito as number)
        .sort((a, b) => a - b),
    [infraruts],
  );
  const remMin = remitos[0];
  const remMax = remitos[remitos.length - 1];
  const totalRange = remMin !== undefined ? remMax - remMin + 1 : 0;

  const { sorted, sortKey, sortDir, toggleSort } = useSort<InfrarutRow, SortKey>(
    infraruts,
    {
      remito: rem,
      cp: (r) => r.cp,
      // null (fecha sin transcribir) va al final en los dos sentidos — ver useSort.
      fecha: (r) => r.fecha,
      finca: (r) => fincaNombre(r.finca_id),
      veh: (r) => r.veh ?? -1,
      maq: (r) => r.maq ?? -1,
      kg_neto: (r) => r.kg_neto,
      trash_pct: (r) => trashPctOf(r) ?? -1,
      brix: (r) => r.brix,
      pol: (r) => r.pol,
      pureza: (r) => r.pureza,
      rdto: (r) => r.rdto,
      kg_azucar: (r) => r.kg_azucar,
      libreta: (r) => libretaStatus(r, cpsCampoSet, bajasSet),
    },
    "remito",
    "asc",
  );
  const data = sorted;
  const remitoAsc = sortKey === "remito" && sortDir === "asc";

  const th = (label: string, key: SortKey) => (
    <TableHead>
      <SortButton
        label={label}
        sortKey={key}
        activeKey={sortKey}
        dir={sortDir}
        onSort={toggleSort}
      />
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[130px] flex-1 rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">Remitos cargados</div>
          <div className="text-lg font-semibold">{infraruts.length}</div>
          <div className="text-xs text-muted-foreground">
            {fechasUnicas(infraruts).length} días
            {sinFecha > 0 && ` · ${sinFecha} sin fecha`}
          </div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">Rango de remitos</div>
          <div className="text-lg font-semibold">
            {remMin !== undefined ? `${remMin}–${remMax}` : "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            {totalRange} números en rango
          </div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">Brechas detectadas</div>
          <div className="text-lg font-semibold text-amber-700 dark:text-amber-300">
            {bigGaps.length}
          </div>
          <div className="text-xs text-muted-foreground">en lo mostrado</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          onClick={() => setShowGaps((v) => !v)}
        >
          {showGaps ? "Ocultar brechas" : `Ver brechas (${bigGaps.length})`}
        </Button>
      </div>

      {showGaps && (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Análisis de remitos faltantes en la secuencia de Jastrow
            </h3>
            <span className="text-xs text-muted-foreground">
              {bigGaps.length} brechas detectadas
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Los remitos son la secuencia propia del campo: un salto significa un
            viaje que no llegó en los INFRARUTs cargados (reporte faltante,
            remito anulado o baja ARCA).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3 font-normal">Desde remito</th>
                  <th className="py-1 pr-3 font-normal">Hasta remito</th>
                  <th className="py-1 pr-3 font-normal">Remitos faltantes</th>
                  <th className="py-1 pr-3 font-normal">Fecha ant.</th>
                  <th className="py-1 pr-3 font-normal">Fecha sig.</th>
                  <th className="py-1 pr-3 font-normal">
                    ¿Posible INFRARUT faltante?
                  </th>
                </tr>
              </thead>
              <tbody>
                {bigGaps.map((g) => (
                  <tr
                    key={`${g.desde}-${g.hasta}`}
                    className={g.probable ? "bg-amber-50 dark:bg-amber-500/10" : "border-t"}
                  >
                    <td className="py-1.5 pr-3 font-medium">{g.desde}</td>
                    <td className="py-1.5 pr-3 font-medium">{g.hasta}</td>
                    <td className="py-1.5 pr-3">
                      <Badge
                        variant={
                          g.faltantes >= 5
                            ? "destructive"
                            : g.faltantes >= 2
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {g.faltantes} remito{g.faltantes > 1 ? "s" : ""}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-3">{formatFechaCorta(g.fechaAnt)}</td>
                    <td className="py-1.5 pr-3">{formatFechaCorta(g.fechaSig)}</td>
                    <td className="py-1.5 pr-3">
                      {g.probable
                        ? `⚠ Revisar — puede faltar el INFRARUT del ${formatFechaCorta(g.fechaAnt)} o ${formatFechaCorta(g.fechaSig)}`
                        : g.fechaAnt == null || g.fechaSig == null
                          ? "Sin fecha en alguno de los dos extremos — cotejar con la libreta"
                          : g.fechaAnt === g.fechaSig
                            ? "Mismo día — cotejar con la libreta (¿anulado o baja ARCA?)"
                            : "Días diferentes — cotejar con la libreta"}
                    </td>
                  </tr>
                ))}
                {bigGaps.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-muted-foreground">
                      Sin brechas — todos los remitos son consecutivos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Sin viajes que coincidan con los filtros"
          description={
            filtrosActivos
              ? "Probá ampliar el rango de fechas o limpiar algún filtro."
              : "Todavía no hay viajes de INFRARUT cargados — importalos desde Resumen."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {th("Remito", "remito")}
                {th("CP ingenio", "cp")}
                {th("Fecha", "fecha")}
                {th("Finca", "finca")}
                {th("Veh", "veh")}
                {th("Máq", "maq")}
                {th("Tn netas", "kg_neto")}
                {th("Trash%", "trash_pct")}
                {th("Brix", "brix")}
                {th("POL", "pol")}
                {th("Pureza", "pureza")}
                {th("Rdto%", "rdto")}
                {th("Kg azúcar", "kg_azucar")}
                {th("Libreta", "libreta")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r, i) => {
                const prev = data[i - 1];
                const showGapRow =
                  remitoAsc &&
                  !!prev &&
                  r.remito != null &&
                  prev.remito != null &&
                  r.remito - prev.remito > 1;
                const saltoRemitos = showGapRow
                  ? (r.remito as number) - (prev.remito as number) - 1
                  : 0;
                const trashPct = trashPctOf(r);
                const libreta = libretaStatus(r, cpsCampoSet, bajasSet);
                return (
                  <Fragment key={r.cp}>
                    {showGapRow && (
                      <TableRow>
                        <TableCell
                          colSpan={14}
                          className="bg-amber-50 dark:bg-amber-500/10 py-1.5 text-center text-xs text-amber-700 dark:text-amber-300"
                        >
                          Salto de{" "}
                          <strong>
                            {saltoRemitos} remito{saltoRemitos > 1 ? "s" : ""}
                          </strong>{" "}
                          entre remito {prev.remito} y remito {r.remito}
                          {r.fecha != null &&
                            prev.fecha != null &&
                            r.fecha !== prev.fecha &&
                            ` · Cambio de fecha: ${formatFechaCorta(prev.fecha)} → ${formatFechaCorta(r.fecha)}`}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow
                      className={`transition-colors hover:bg-muted ${libreta === "sin_manual" ? "border-l-2 border-l-amber-500" : ""}`}
                    >
                      <TableCell className="font-semibold text-blue-700 dark:text-blue-300">
                        {r.remito ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.cp}
                      </TableCell>
                      <TableCell>
                        {r.fecha != null ? (
                          formatFechaCorta(r.fecha)
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-slate-200 dark:border-slate-500/25 bg-slate-50 dark:bg-slate-500/10 font-normal text-muted-foreground"
                            title="El ingenio confirmó el viaje; falta transcribir la fecha de salida de la libreta"
                          >
                            Pendiente libreta
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.finca_id === "LOTE4" ? "default" : "secondary"}
                        >
                          {fincaNombre(r.finca_id)}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.veh ?? "—"}</TableCell>
                      <TableCell>{r.maq !== null ? `#${r.maq}` : "—"}</TableCell>
                      <TableCell>{formatTn(r.kg_neto / 1000)}</TableCell>
                      <TableCell>
                        {trashPct !== null ? formatPercent(trashPct) : "—"}
                      </TableCell>
                      <TableCell>{r.brix.toFixed(2)}</TableCell>
                      <TableCell>{r.pol.toFixed(2)}</TableCell>
                      <TableCell
                        className={
                          r.pureza < 85 ? "font-medium text-amber-700 dark:text-amber-300" : ""
                        }
                      >
                        {r.pureza.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            r.rdto >= META
                              ? "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : r.rdto >= 9.5
                                ? "border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                : "border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300"
                          }
                        >
                          {formatPercent(r.rdto)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatKg(r.kg_azucar)}</TableCell>
                      <TableCell>
                        {libreta === "baja" ? (
                          <Badge
                            variant="outline"
                            className="border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          >
                            ⚠ Baja ARCA
                          </Badge>
                        ) : libreta === "en_libreta" ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          >
                            ✅ En libreta
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300"
                          >
                            ❌ Sin manual
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
