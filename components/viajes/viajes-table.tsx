"use client";

import { Fragment, useMemo, useState } from "react";
import { META, type InfrarutRow } from "@/lib/business-rules";
import { detectarBrechas, libretaStatus } from "@/lib/reconciliation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Orden = "cp_asc" | "cp_desc" | "fecha";

export function ViajesTable({
  infraruts,
  cpsCampo,
  bajas,
}: {
  infraruts: InfrarutRow[];
  cpsCampo: number[];
  bajas: number[];
}) {
  const [fecha, setFecha] = useState("");
  const [finca, setFinca] = useState("");
  const [busca, setBusca] = useState("");
  const [orden, setOrden] = useState<Orden>("cp_asc");
  const [showGaps, setShowGaps] = useState(false);

  const fechas = useMemo(
    () => [...new Set(infraruts.map((r) => r.fecha))].sort(),
    [infraruts],
  );
  const cpsCampoSet = useMemo(() => new Set(cpsCampo), [cpsCampo]);
  const bajasSet = useMemo(() => new Set(bajas), [bajas]);
  // detectarBrechas ya devuelve las brechas ordenadas por faltantes desc, con
  // `probable` precalculado (index_10.html:1912) — ver lib/reconciliation.ts.
  const bigGaps = useMemo(() => detectarBrechas(infraruts), [infraruts]);

  // Orden, búsqueda, rango y saltos: todo por REMITO (la numeración propia del
  // campo) — la carta de porte (cp) la asigna el ingenio y solo se muestra como
  // dato secundario. Ver lib/reconciliation.ts.
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

  const data = useMemo(() => {
    let d = [...infraruts];
    if (fecha) d = d.filter((r) => r.fecha === fecha);
    if (finca) d = d.filter((r) => r.finca_id === finca);
    if (busca) d = d.filter((r) => String(r.remito ?? "").includes(busca));
    if (orden === "cp_asc") d.sort((a, b) => rem(a) - rem(b));
    else if (orden === "cp_desc") d.sort((a, b) => rem(b) - rem(a));
    else d.sort((a, b) => a.fecha.localeCompare(b.fecha) || rem(a) - rem(b));
    return d;
  }, [infraruts, fecha, finca, busca, orden]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[130px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">Remitos cargados</div>
          <div className="text-lg font-semibold">{infraruts.length}</div>
          <div className="text-xs text-neutral-400">{fechas.length} días</div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">Rango de remitos</div>
          <div className="text-lg font-semibold">
            {remMin}–{remMax}
          </div>
          <div className="text-xs text-neutral-400">
            {totalRange} números en rango
          </div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-white p-3">
          <div className="text-xs text-neutral-500">Mostrando</div>
          <div className="text-lg font-semibold text-amber-700">
            {data.length}
          </div>
          <div className="text-xs text-neutral-400">viajes filtrados</div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3">
        <div className="space-y-1">
          <label className="text-xs text-neutral-500">Fecha</label>
          <Select
            value={fecha || "todas"}
            onValueChange={(v) => setFecha(v === "todas" ? "" : v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {fechas.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-500">Finca</label>
          <Select
            value={finca || "todas"}
            onValueChange={(v) => setFinca(v === "todas" ? "" : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="LOTE4">LOTE4</SelectItem>
              <SelectItem value="VIRGINIA">LA VIRGINIA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-500">Buscar remito</label>
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ej: 6905"
            className="w-32"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-500">Orden</label>
          <Select value={orden} onValueChange={(v) => setOrden(v as Orden)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cp_asc">Remito ascendente</SelectItem>
              <SelectItem value="cp_desc">Remito descendente</SelectItem>
              <SelectItem value="fecha">Fecha</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
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
          <div className="flex flex-wrap items-center gap-1 border-t pt-2 text-xs text-neutral-500">
            <strong className="mr-1">Fechas con INFRARUTs cargados:</strong>
            {fechas.map((f) => (
              <span
                key={f}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"
              >
                {f.slice(5)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Remito</TableHead>
              <TableHead>CP ingenio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Finca</TableHead>
              <TableHead>Veh</TableHead>
              <TableHead>Máq</TableHead>
              <TableHead>Tn netas</TableHead>
              <TableHead>Trash%</TableHead>
              <TableHead>Brix</TableHead>
              <TableHead>POL</TableHead>
              <TableHead>Pureza</TableHead>
              <TableHead>Rdto%</TableHead>
              <TableHead>Kg azúcar</TableHead>
              <TableHead>Libreta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r, i) => {
              const prev = data[i - 1];
              const showGapRow =
                orden === "cp_asc" &&
                !!prev &&
                r.remito != null &&
                prev.remito != null &&
                r.remito - prev.remito > 1;
              const saltoRemitos =
                showGapRow ? (r.remito as number) - (prev.remito as number) - 1 : 0;
              const trashPct =
                r.kg_trash > 0
                  ? (r.kg_trash / (r.kg_neto + r.kg_trash)) * 100
                  : null;
              const libreta = libretaStatus(r, cpsCampoSet, bajasSet);
              const highlight =
                busca && String(r.remito ?? "").includes(busca)
                  ? "bg-emerald-50"
                  : "";
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
                    className={`${highlight} ${libreta === "sin_manual" ? "border-l-2 border-l-amber-500" : ""}`}
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
                        {r.finca_id === "LOTE4" ? "LOTE4" : "LA VIRGINIA"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.veh ?? "—"}</TableCell>
                    <TableCell>{r.maq !== null ? `#${r.maq}` : "—"}</TableCell>
                    <TableCell>{(r.kg_neto / 1000).toFixed(2)} t</TableCell>
                    <TableCell>
                      {trashPct !== null ? `${trashPct.toFixed(2)}%` : "—"}
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
                        {r.rdto.toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell>{r.kg_azucar.toLocaleString("es-AR")}</TableCell>
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
            {data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={14}
                  className="py-8 text-center text-neutral-400"
                >
                  Sin viajes que coincidan con los filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
