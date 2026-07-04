// Schema, tipos y estado inicial del form de Bajas ARCA. Vive fuera de
// actions/bajas-arca.ts por la misma razón que el resto de lib/forms/ — ver CLAUDE.md.
import { z } from "zod";

// index_10.html:498-504
export const BAJA_MOTIVOS = [
  "Camión enterrado — sin carga",
  "Camión rechazado en balanza",
  "Error de emisión",
  "Carga cancelada",
  "Otro",
] as const;

export const addBajaArcaSchema = z.object({
  cp: z.coerce.number().int().positive("Ingresá un número de CP válido"),
  fecha: z.string().optional(),
  motivo: z.string().optional(),
  obs: z.string().optional(),
});

export type BajaArcaActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export const BAJA_ARCA_ACTION_IDLE: BajaArcaActionState = { status: "idle" };
