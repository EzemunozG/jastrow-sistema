// Schema, tipos y parsing de inputs para el alta manual de CPs del campo. Vive fuera de
// actions/cps-campo.ts porque un archivo "use server" solo puede exportar funciones
// async — ver CLAUDE.md.
import { z } from "zod";
import { INGENIOS, type IngenioId } from "@/lib/business-rules";

export const ingenioIdSchema = z.enum(
  INGENIOS.map((i) => i.id) as [IngenioId, ...IngenioId[]],
);

export const addCpsCampoSchema = z.object({
  raw: z.string().min(1, "Ingresá un remito o rango"),
  ingenio_id: ingenioIdSchema,
  fecha: z.string().optional(),
  camion: z.string().optional(),
  obs: z.string().optional(),
});

export const addCpsListaSchema = z.object({
  raw: z.string().min(1, "Pegá una lista de remitos"),
  ingenio_id: ingenioIdSchema,
  fecha: z.string().optional(),
});

export type CpsCampoActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; added: number; skipped: number };

export const CPS_CAMPO_ACTION_IDLE: CpsCampoActionState = { status: "idle" };

// index_10.html:1494-1506 — acepta un número suelto o un rango "desde-hasta".
export function parseCpInput(raw: string): number[] {
  const trimmed = raw.trim();
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-").map((s) => parseInt(s.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] > parts[0]) {
      const out: number[] = [];
      for (let i = parts[0]; i <= parts[1]; i++) out.push(i);
      return out;
    }
    return [];
  }
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? [] : [n];
}

// index_10.html:1482 — lista pegada separada por comas, saltos de línea o espacios.
export function parseCpLista(raw: string): number[] {
  return raw
    .split(/[\n,;\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
}
