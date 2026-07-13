"use client";

import { useState, useTransition } from "react";
import { importInfraruts, type ImportInfrarutsResult } from "@/actions/infraruts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INGENIOS, type IngenioId } from "@/lib/business-rules";
import {
  parseInfrarutWorkbook,
  type InfrarutImportRow,
} from "@/lib/excel/parse-infraruts";
import type { ParseResult } from "@/lib/excel/parse-common";

export function InfrarutsImportForm() {
  const [parsed, setParsed] = useState<ParseResult<InfrarutImportRow> | null>(
    null,
  );
  const [filename, setFilename] = useState("");
  const [ingenioId, setIngenioId] = useState<IngenioId>("concepcion");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportInfrarutsResult | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setResult(null);
    const buf = await file.arrayBuffer();
    setParsed(parseInfrarutWorkbook(buf));
    e.target.value = "";
  }

  function handleImport() {
    if (!parsed || parsed.valid.length === 0) return;
    startTransition(async () => {
      const res = await importInfraruts(filename, parsed.valid, ingenioId);
      setResult(res);
      if (res.status === "success") setParsed(null);
    });
  }

  const ingenioNombre =
    INGENIOS.find((i) => i.id === ingenioId)?.nombre ?? ingenioId;

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="text-sm font-semibold">Importar INFRARUT (Excel)</h2>
      <p className="text-xs text-neutral-500">
        Mapeo de columnas provisorio (cp, remito, fecha, finca, veh, maq,
        kg_neto, kg_trash, kg_azucar, brix, pol, pureza, rdto) — ajustar
        cuando haya un archivo real de exportación del ingenio.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ingenio-import" className="text-xs">
            Ingenio
          </Label>
          <Select
            value={ingenioId}
            onValueChange={(v) => setIngenioId(v as IngenioId)}
          >
            <SelectTrigger id="ingenio-import" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INGENIOS.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="max-w-xs"
        />
      </div>

      {parsed && (
        <div className="space-y-2 text-sm">
          <p>
            <strong>{parsed.valid.length}</strong> filas válidas
            {parsed.errors.length > 0 && (
              <span className="ml-1 text-red-600">
                · {parsed.errors.length} con errores
              </span>
            )}
          </p>
          {parsed.errors.length > 0 && (
            <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-red-600">
              {parsed.errors.slice(0, 10).map((e) => (
                <li key={e.row}>
                  Fila {e.row}: {e.errors.join(", ")}
                </li>
              ))}
            </ul>
          )}
          <Button
            onClick={handleImport}
            disabled={pending || parsed.valid.length === 0}
            size="sm"
          >
            {pending
              ? "Importando…"
              : `Importar ${parsed.valid.length} filas a ${ingenioNombre}`}
          </Button>
        </div>
      )}

      {result?.status === "error" && (
        <p className="text-sm text-red-600">{result.error}</p>
      )}
      {result?.status === "success" && (
        <p className="text-sm text-emerald-700">
          Se importaron {result.count} filas.
        </p>
      )}
    </div>
  );
}
