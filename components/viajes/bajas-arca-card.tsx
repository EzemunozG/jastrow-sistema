"use client";

import { useActionState } from "react";
import { addBajaArca, deleteBajaArca, toggleGestionBaja } from "@/actions/bajas-arca";
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
import type { Database } from "@/lib/database.types";
import { BAJA_ARCA_ACTION_IDLE, BAJA_MOTIVOS } from "@/lib/forms/bajas-arca";

type BajaArca = Database["public"]["Tables"]["bajas_arca"]["Row"];

export function BajasArcaCard({ bajas }: { bajas: BajaArca[] }) {
  const [state, action, pending] = useActionState(
    addBajaArca,
    BAJA_ARCA_ACTION_IDLE,
  );

  return (
    <div className="space-y-3 rounded-xl border border-l-4 border-l-red-500 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-red-700">
          Remitos a dar de baja en ARCA
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Carta de porte emitidas que no generaron viaje real (camión sin
          carga, rechazado, enterrado, etc.). Deben ser formalmente anuladas
          ante ARCA/AFIP para evitar inconsistencias fiscales.
        </p>
      </div>

      {bajas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-1 pr-3 font-normal">CP #</th>
                <th className="py-1 pr-3 font-normal">Fecha</th>
                <th className="py-1 pr-3 font-normal">Motivo</th>
                <th className="py-1 pr-3 font-normal">Obs.</th>
                <th className="py-1 pr-3 font-normal">Estado</th>
                <th className="py-1 pr-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {bajas.map((b) => (
                <tr
                  key={b.cp}
                  className={`border-t ${b.gestionado ? "bg-emerald-50/40" : "bg-red-50/40"}`}
                >
                  <td className="py-1.5 pr-3 font-bold text-red-700">{b.cp}</td>
                  <td className="py-1.5 pr-3">{b.fecha || "—"}</td>
                  <td className="py-1.5 pr-3">{b.motivo || "—"}</td>
                  <td className="py-1.5 pr-3 text-neutral-500">
                    {b.obs || "—"}
                  </td>
                  <td className="py-1.5 pr-3">
                    <button
                      type="button"
                      onClick={() => toggleGestionBaja(b.cp, !b.gestionado)}
                    >
                      <Badge
                        variant="outline"
                        className={
                          b.gestionado
                            ? "cursor-pointer border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "cursor-pointer border-red-200 bg-red-50 text-red-700"
                        }
                      >
                        {b.gestionado ? "✅ Gestionado" : "❌ Pendiente"}
                      </Badge>
                    </button>
                  </td>
                  <td className="py-1.5 pr-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBajaArca(b.cp)}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-2 text-center text-xs text-neutral-400">
          No hay bajas registradas.
        </p>
      )}

      <form action={action} className="flex flex-wrap items-end gap-3 border-t pt-3">
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500" htmlFor="inp-baja-cp">
            N° CP a dar de baja *
          </label>
          <Input
            id="inp-baja-cp"
            name="cp"
            type="number"
            placeholder="Ej: 6908"
            className="w-32"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500" htmlFor="inp-baja-fecha">
            Fecha emisión
          </label>
          <Input id="inp-baja-fecha" name="fecha" type="date" className="w-40" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500" htmlFor="inp-baja-motivo">
            Motivo
          </label>
          <Select name="motivo" defaultValue={BAJA_MOTIVOS[0]}>
            <SelectTrigger id="inp-baja-motivo" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BAJA_MOTIVOS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500" htmlFor="inp-baja-obs">
            Obs.
          </label>
          <Input
            id="inp-baja-obs"
            name="obs"
            placeholder="Detalle adicional..."
            className="w-44"
          />
        </div>
        <Button type="submit" size="sm" disabled={pending} variant="destructive">
          {pending ? "Registrando…" : "+ Registrar baja"}
        </Button>
      </form>
      {state.status === "error" && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </div>
  );
}
