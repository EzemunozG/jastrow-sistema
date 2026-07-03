// Schema, tipos y estado inicial del form de Facturas. Vive fuera de
// actions/facturas.ts porque un archivo "use server" solo puede exportar
// funciones async — cualquier const/schema exportado ahí revienta en runtime
// ("A 'use server' file can only export async functions, found object").
import { z } from "zod";

export const FACTURA_TIPOS = [
  "Factura A",
  "Factura B",
  "Factura C",
  "Ticket",
  "Remito",
  "Presupuesto",
  "Otro",
] as const;

export const FACTURA_CATEGORIAS = [
  "Agroquímicos",
  "Fertilizantes",
  "Semillas / Plantines",
  "Combustible",
  "Maquinaria / Servicios",
  "Mano de obra",
  "Arriendo",
  "Otros insumos",
  "Otro",
] as const;

export const facturaItemSchema = z.object({
  descripcion: z.string().min(1, "Descripción del ítem requerida"),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  unidad: z.string().min(1, "Unidad requerida"),
  precio_unit: z.coerce.number().nonnegative("El precio no puede ser negativo"),
});

export const facturaSchema = z.object({
  idOriginal: z.string().optional(),
  numero: z.string().min(1, "N° de comprobante obligatorio"),
  tipo: z.enum(FACTURA_TIPOS),
  proveedor: z.string().min(1, "Proveedor obligatorio"),
  cuit: z.string().optional(),
  fecha: z.string().min(1, "Fecha obligatoria"),
  categoria: z.enum(FACTURA_CATEGORIAS),
  obs: z.string().optional(),
  existingImgPath: z.string().optional(),
  items: z
    .array(facturaItemSchema)
    .min(1, "Agregá al menos un ítem a la factura"),
});

export type FacturaItemValues = z.input<typeof facturaItemSchema>;
export type FacturaFormValues = z.input<typeof facturaSchema>;

export type FacturaActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export const FACTURA_ACTION_IDLE: FacturaActionState = { status: "idle" };
