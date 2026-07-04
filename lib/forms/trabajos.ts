// Schema, tipos y estado inicial del form de Trabajos. Vive fuera de
// actions/trabajos.ts porque un archivo "use server" solo puede exportar
// funciones async — cualquier const/schema exportado ahí revienta en runtime
// ("A 'use server' file can only export async functions, found object").
import { z } from "zod";

// index_10.html:611-613 (optgroups del <select id="mt-tipo">)
export const TRABAJO_TIPOS_GRUPOS = [
  {
    label: "Labores mecánicas",
    tipos: [
      "Subsolado",
      "Rastraje",
      "Surcado",
      "Plantación",
      "Cosecha",
      "Despaje / Quema",
      "Riego",
    ],
  },
  {
    label: "Agroquímicos",
    tipos: [
      "Fertilización",
      "Herbicida",
      "Insecticida",
      "Fungicida",
      "Madurante",
      "Enmienda calcárea",
    ],
  },
  {
    label: "Otros",
    tipos: ["Control sanitario", "Muestreo / análisis", "Otro"],
  },
] as const;

export const TRABAJO_UNIDADES = [
  "kg",
  "tn",
  "l",
  "ml",
  "unid",
  "bolsa",
  "ha",
] as const;

export const trabajoInsumoSchema = z.object({
  descripcion: z.string().min(1, "Descripción del insumo requerida"),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  unidad: z.string().min(1),
  precio_unit: z.coerce.number().nonnegative(),
  factura_id: z.string().optional(),
});

export const trabajoSchema = z.object({
  lote_id: z.string().min(1),
  fecha: z.string().min(1, "Fecha obligatoria"),
  tipo: z.string().min(1, "Tipo de trabajo obligatorio"),
  ha: z.string().optional(),
  empresa: z.string().optional(),
  costo_labor: z.string().optional(),
  obs: z.string().optional(),
  insumos: z.array(trabajoInsumoSchema),
});

export type TrabajoActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export const TRABAJO_ACTION_IDLE: TrabajoActionState = { status: "idle" };
