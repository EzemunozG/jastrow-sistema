"use client";

import { Fragment, useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { META, fincaNombre, type InfrarutRow } from "@/lib/business-rules";
import { formatKg, formatPercent, formatTn } from "@/lib/format";
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
        <div className="min-w-[130px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">Remitos cargados</div>
          <div className="text-lg font-semibold">{infraruts.length}</div>
          <div className="text-xs text-neutral-400">
            {new Set(infraruts.map((r) => r.fecha)).size} días
          </div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">Rango de remitos</div>
          <div className="text-lg font-semibold">
            {remMin !== undefined ? `${remMin}–${remMax}` : "—"}
          </div>
          <div className="text-xs text-neutral-400">
            {totalRange} números en rango
          </div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">Brechas detectadas</div>
          <div className="text-lg font-semibold text-amber-700">
            {bigGaps.length}
          </div>
          <div className="text-xs text-neutral-400">en lo mostrado</div>
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
        <div className="space-y-2 rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Análisis de remitos faltantes en la secuencia de Jastrow
            </h3>
            <span className="text-xs text-neutral-400">
              {bigGaps.length} brechas detectadas
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Los remitos son la secuencia propia del campo: un salto significa un
            viaje que no llegó en los INFRARUTs cargados (reporte faltante,
            remito anulado o baja ARCA).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-neutral-500">
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
                    className={g.probable ? "bg-amber-50" : "border-t"}
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
                    <td className="py-1.5 pr-3">{g.fechaAnt.slice(5)}</td>
                    <td className="py-1.5 pr-3">{g.fechaSig.slice(5)}</td>
                    <td className="py-1.5 pr-3">
                      {g.probable
                        ? `⚠ Revisar — puede faltar el INFRARUT del ${g.fechaAnt.slice(5)} o ${g.fechaSig.slice(5)}`
                        : g.fechaAnt === g.fechaSig
                          ? "Mismo día — cotejar con la libreta (¿anulado o baja ARCA?)"
                          : "Días diferentes — cotejar con la libreta"}
                    </td>
                  </tr>
                ))}
                {bigGaps.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-neutral-400">
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
        <div className="overflow-x-auto rounded-xl border bg-white">
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
                          className="bg-amber-50 py-1.5 text-center text-xs text-amber-700"
                        >
                          Salto de{" "}
                          <strong>
                            {saltoRemitos} remito{saltoRemitos > 1 ? "s" : ""}
                          </strong>{" "}
                          entre remito {prev.remito} y remito {r.remito}
                          {r.fecha !== prev.fecha &&
                            ` · Cambio de fecha: ${prev.fecha.slice(5)} → ${r.fecha.slice(5)}`}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow
                      className={`transition-colors hover:bg-neutral-50 ${libreta === "sin_manual" ? "border-l-2 border-l-amber-500" : ""}`}
                    >
                      <TableCell className="font-semibold text-blue-700">
                        {r.remito ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500">
                        {r.cp}
                      </TableCell>
                      <TableCell>{r.fecha.slice(5)}</TableCell>
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
                          r.pureza < 85 ? "font-medium text-amber-700" : ""
                        }
                      >
                        {r.pureza.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            r.rdto >= META
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : r.rdto >= 9.5
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-red-200 bg-red-50 text-red-700"
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
                            className="border-amber-200 bg-amber-50 text-amber-700"
                          >
                            ⚠ Baja ARCA
                          </Badge>
                        ) : libreta === "en_libreta" ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700"
                          >
                            ✅ En libreta
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-red-200 bg-red-50 text-red-700"
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
