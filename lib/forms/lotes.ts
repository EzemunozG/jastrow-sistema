// Schema, tipos y estado inicial del form de Lotes. Vive fuera de actions/lotes.ts
// porque un archivo "use server" solo puede exportar funciones async — cualquier
// const/schema exportado ahí revienta en runtime ("A 'use server' file can only
// export async functions, found object").
import { z } from "zod";

export const loteSchema = z.object({
  id: z.string().min(1, "El ID del lote es obligatorio"),
  idOriginal: z.string().optional(), // presente al editar, para permitir renombrar el id
  nombre: z.string().optional(),
  ha: z.coerce.number().positive("Las hectáreas deben ser mayores a 0"),
  tipo: z.enum(["Propio", "Arrendado"]),
  finca_id: z.string().optional(),
  variedad: z.string().optional(),
  soca: z.coerce.number().int().nonnegative().optional(),
  fecha_plantacion: z.string().optional(),
  estado: z.enum(["Pendiente", "En cosecha", "Cosechado"]),
  arriendo: z.coerce.number().nonnegative().optional(),
  arriendo_obs: z.string().optional(),
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
  propietario: z.string().optional(),
  contrato: z.string().optional(),
  obs: z.string().optional(),
});

export type LoteFormValues = z.input<typeof loteSchema>;

export type LoteActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export const LOTE_ACTION_IDLE: LoteActionState = { status: "idle" };
