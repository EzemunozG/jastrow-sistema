"use client";

import { useActionState, useEffect } from "react";
import { addCpsCampo, addCpsLista } from "@/actions/cps-campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CPS_CAMPO_ACTION_IDLE,
  type CpsCampoActionState,
} from "@/lib/forms/cps-campo";

function ResultMessage({ state }: { state: CpsCampoActionState }) {
  if (state.status === "error") {
    return <p className="text-sm text-red-600">{state.error}</p>;
  }
  if (state.status === "success") {
    return (
      <p className="text-sm text-emerald-700">
        {state.added} remito{state.added !== 1 ? "s" : ""} agregado
        {state.added !== 1 ? "s" : ""}
        {state.skipped > 0 && ` (${state.skipped} ya existían)`}.
      </p>
    );
  }
  return null;
}

export function RegistrarCpsForm() {
  const [singleState, singleAction, singlePending] = useActionState(
    addCpsCampo,
    CPS_CAMPO_ACTION_IDLE,
  );
  const [listaState, listaAction, listaPending] = useActionState(
    addCpsLista,
    CPS_CAMPO_ACTION_IDLE,
  );

  // Limpia los inputs de texto después de una alta exitosa (index_10.html los vacía a mano).
  useEffect(() => {
    if (singleState.status === "success") {
      const raw = document.getElementById("inp-cp-campo") as HTMLInputElement | null;
      const camion = document.getElementById("inp-cp-camion") as HTMLInputElement | null;
      const obs = document.getElementById("inp-cp-obs") as HTMLInputElement | null;
      if (raw) raw.value = "";
      if (camion) camion.value = "";
      if (obs) obs.value = "";
    }
  }, [singleState]);

  useEffect(() => {
    if (listaState.status === "success") {
      const raw = document.getElementById("inp-cp-lista") as HTMLTextAreaElement | null;
      if (raw) raw.value = "";
    }
  }, [listaState]);

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold">
          Registrar remitos emitidos desde el campo
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Ingresá los números de remito que salieron del campo. El
          sistema los cruza contra el INFRARUT y muestra cuáles no figuran.
        </p>
      </div>

      <form action={singleAction} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500" htmlFor="inp-cp-campo">
            Remito individual o rango
          </label>
          <Input
            id="inp-cp-campo"
            name="raw"
            placeholder="Ej: 4350 o 4350-4380"
            className="w-52"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500" htmlFor="inp-cp-fecha">
            Fecha de salida
          </label>
          <Input id="inp-cp-fecha" name="fecha" type="date" className="w-40" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500" htmlFor="inp-cp-camion">
            Camión / Chofer (opcional)
          </label>
          <Input
            id="inp-cp-camion"
            name="camion"
            placeholder="Ej: 1163 / Juan"
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500" htmlFor="inp-cp-obs">
            Obs.
          </label>
          <Input
            id="inp-cp-obs"
            name="obs"
            placeholder="Lote, turno..."
            className="w-40"
          />
        </div>
        <Button type="submit" size="sm" disabled={singlePending}>
          {singlePending ? "Agregando…" : "Agregar"}
        </Button>
      </form>
      <ResultMessage state={singleState} />

      <div className="border-t pt-3">
        <p className="mb-2 text-xs text-neutral-500">
          También podés pegar una lista completa separada por comas o saltos
          de línea:
        </p>
        <form action={listaAction} className="flex flex-wrap items-end gap-3">
          <Textarea
            id="inp-cp-lista"
            name="raw"
            placeholder={"Ej:\n4350\n4351\n4352..."}
            className="h-20 w-52"
          />
          <div className="space-y-1.5">
            <label
              className="text-xs text-neutral-500"
              htmlFor="inp-lista-fecha"
            >
              Fecha para la lista
            </label>
            <Input
              id="inp-lista-fecha"
              name="fecha"
              type="date"
              className="w-40"
            />
          </div>
          <Button type="submit" size="sm" disabled={listaPending}>
            {listaPending ? "Cargando…" : "Cargar lista"}
          </Button>
        </form>
        <ResultMessage state={listaState} />
      </div>
    </div>
  );
}
