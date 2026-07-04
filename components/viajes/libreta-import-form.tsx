"use client";

import { useState, useTransition } from "react";
import { importLibreta, type ImportLibretaResult } from "@/actions/cps-campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  parseLibretaWorkbook,
  type BajaCandidata,
  type LibretaRow,
} from "@/lib/excel/parse-libreta";
import type { ParseResult } from "@/lib/excel/parse-common";

export function LibretaImportForm() {
  const [parsed, setParsed] = useState<{
    libreta: ParseResult<LibretaRow>;
    bajasCandidatas: BajaCandidata[];
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportLibretaResult | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    const buf = await file.arrayBuffer();
    setParsed(parseLibretaWorkbook(buf));
    e.target.value = "";
  }

  function handleImport() {
    if (!parsed || parsed.libreta.valid.length === 0) return;
    startTransition(async () => {
      const res = await importLibreta(parsed.libreta.valid, parsed.bajasCandidatas);
      setResult(res);
      if (res.status === "success") setParsed(null);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="text-sm font-semibold">Subir libreta del campo (Excel)</h2>
      <Input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        className="max-w-xs"
      />

      {parsed && (
        <div className="space-y-2 text-sm">
          <p>
            <strong>{parsed.libreta.valid.length}</strong> despachos leídos
            {parsed.bajasCandidatas.length > 0 && (
              <span className="ml-1 text-amber-700">
                · {parsed.bajasCandidatas.length} bajas ARCA detectadas
              </span>
            )}
            {parsed.libreta.errors.length > 0 && (
              <span className="ml-1 text-red-600">
                · {parsed.libreta.errors.length} con errores
              </span>
            )}
          </p>
          {parsed.libreta.errors.length > 0 && (
            <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-red-600">
              {parsed.libreta.errors.slice(0, 10).map((e) => (
                <li key={e.row}>
                  Fila {e.row}: {e.errors.join(", ")}
                </li>
              ))}
            </ul>
          )}
          <Button
            onClick={handleImport}
            disabled={pending || parsed.libreta.valid.length === 0}
            size="sm"
          >
            {pending
              ? "Importando…"
              : `Importar ${parsed.libreta.valid.length} despachos`}
          </Button>
        </div>
      )}

      {result?.status === "error" && (
        <p className="text-sm text-red-600">{result.error}</p>
      )}
      {result?.status === "success" && (
        <p className="text-sm text-emerald-700">
          Se cargaron {result.count} despachos
          {result.bajas > 0 && ` (${result.bajas} bajas ARCA nuevas)`}.
        </p>
      )}
    </div>
  );
}
