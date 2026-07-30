"use client";

import { useMemo, useState } from "react";
import { getCamNum, getDesp, getFinca, getHora, getMatricula } from "@/lib/libreta";
import { reconciliar, type BajaArcaRow, type CpCampoRow } from "@/lib/reconciliation";
import type { InfrarutRow } from "@/lib/business-rules";
import { Badge } from "@/components/ui/badge";
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

type Estado = "reconciliado" | "pendiente" | "baja";

const ESTADO_LABEL: Record<Estado, string> = {
  reconciliado: "✅ Confirmado",
  baja: "⚠ Baja ARCA",
  pendiente: "❌ Sin confirmar",
};

const ESTADO_CLASS: Record<Estado, string> = {
  reconciliado: "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  baja: "border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
  pendiente: "border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300",
};

const ROW_BG: Record<Estado, string> = {
  reconciliado: "bg-emerald-50/40 dark:bg-emerald-500/10",
  baja: "bg-amber-50 dark:bg-amber-500/10",
  pendiente: "",
};

export function LibretaTable({
  cpsCampo,
  bajas,
  infraruts,
}: {
  cpsCampo: CpCampoRow[];
  bajas: BajaArcaRow[];
  infraruts: InfrarutRow[];
}) {
  const [finca, setFinca] = useState("");
  const [estado, setEstado] = useState("");
  const [busca, setBusca] = useState("");

  const { reconciliados, pendientes } = useMemo(
    () => reconciliar(cpsCampo, infraruts, bajas),
    [cpsCampo, infraruts, bajas],
  );
  const reconciliadosSet = useMemo(
    () => new Set(reconciliados.map((r) => r.cp)),
    [reconciliados],
  );
  const bajasSet = useMemo(() => new Set(bajas.map((b) => b.cp)), [bajas]);

  function estadoDe(cp: number): Estado {
    if (bajasSet.has(cp)) return "baja";
    if (reconciliadosSet.has(cp)) return "reconciliado";
    return "pendiente";
  }

  const data = useMemo(() => {
    let d = [...cpsCampo];
    if (finca) d = d.filter((x) => getFinca(x) === finca);
    if (estado) d = d.filter((x) => estadoDe(x.cp) === estado);
    if (busca) d = d.filter((x) => String(x.cp).includes(busca));
    return d.sort((a, b) => a.cp - b.cp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpsCampo, finca, estado, busca, reconciliadosSet, bajasSet]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[130px] flex-1 rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">Total despachos</div>
          <div className="text-lg font-semibold">{cpsCampo.length}</div>
          <div className="text-xs text-muted-foreground">en la libreta</div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">✅ Reconciliados</div>
          <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            {reconciliados.length}
          </div>
          <div className="text-xs text-muted-foreground">en INFRARUT</div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">❌ Sin reconciliar</div>
          <div className="text-lg font-semibold text-red-700 dark:text-red-300">
            {pendientes.length}
          </div>
          <div className="text-xs text-muted-foreground">no están en INFRARUT</div>
        </div>
        <div className="min-w-[130px] flex-1 rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">⚠ Bajas ARCA</div>
          <div className="text-lg font-semibold text-amber-700 dark:text-amber-300">
            {bajas.length}
          </div>
          <div className="text-xs text-muted-foreground">a gestionar</div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Finca</label>
          <Select
            value={finca || "todas"}
            onValueChange={(v) => setFinca(v === "todas" ? "" : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="TANO">TANO (Las 101)</SelectItem>
              <SelectItem value="LAS100">LAS 100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Estado</label>
          <Select
            value={estado || "todos"}
            onValueChange={(v) => setEstado(v === "todos" ? "" : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="reconciliado">✅ Reconciliados</SelectItem>
              <SelectItem value="pendiente">❌ Sin reconciliar</SelectItem>
              <SelectItem value="baja">⚠ Bajas ARCA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Buscar remito</label>
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ej: 6905"
            className="w-32"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Remito</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Finca</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>N° Camión</TableHead>
              <TableHead>Despacho</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Obs.</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((x) => {
              const est = estadoDe(x.cp);
              return (
                <TableRow key={x.cp} className={ROW_BG[est]}>
                  <TableCell className="font-semibold text-blue-700 dark:text-blue-300">
                    {x.cp}
                  </TableCell>
                  <TableCell>{(x.fecha ?? "").slice(5)}</TableCell>
                  <TableCell>
                    <Badge variant={getFinca(x) === "LAS100" ? "secondary" : "default"}>
                      {getFinca(x) === "LAS100" ? "LAS 100" : "TANO"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{getMatricula(x)}</TableCell>
                  <TableCell className="text-xs">{getCamNum(x)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {getDesp(x)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {getHora(x)}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                    {x.obs || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ESTADO_CLASS[est]}>
                      {ESTADO_LABEL[est]}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-muted-foreground"
                >
                  Sin resultados para el filtro seleccionado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
