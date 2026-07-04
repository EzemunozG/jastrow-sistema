// Schema, tipos y estado inicial del form de Recetas. Vive fuera de actions/recetas.ts
// por la misma razón que el resto de lib/forms/ — ver CLAUDE.md.
import { z } from "zod";

export const RECETA_TIPOS = [
  "Herbicida",
  "Fertilización",
  "Insecticida",
  "Fungicida",
  "Madurante",
  "Otro",
] as const;

export const recetaItemSchema = z.object({
  producto_id: z.string().min(1, "Seleccioná un producto"),
  dosis: z.coerce.number().positive("La dosis debe ser mayor a 0"),
});

export const recetaSchema = z.object({
  fecha: z.string().min(1, "Fecha obligatoria"),
  loteId: z.string().min(1, "Seleccioná un lote"),
  ha: z.coerce.number().positive("Las hectáreas deben ser mayores a 0"),
  tipo: z.string().min(1),
  empresa: z.string().optional(),
  obs: z.string().optional(),
  items: z.array(recetaItemSchema).min(1, "Agregá al menos un producto"),
});

export type RecetaItemValues = z.input<typeof recetaItemSchema>;
export type RecetaFormValues = z.input<typeof recetaSchema>;

export type RecetaActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export const RECETA_ACTION_IDLE: RecetaActionState = { status: "idle" };
