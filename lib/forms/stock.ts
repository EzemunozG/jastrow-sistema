// Schema, tipos y estado inicial del form de entrada de stock. Vive fuera de
// actions/stock.ts por la misma razón que el resto de lib/forms/ — ver CLAUDE.md.
import { z } from "zod";

// index_10.html:2892 (catColor) — mismas categorías que usa Facturas para consistencia.
export const STOCK_CATEGORIAS = [
  "Herbicida",
  "Fertilizante",
  "Bioestimulante",
  "Insecticida",
  "Fungicida",
  "Madurante",
  "Otro",
] as const;

export const STOCK_UNIDADES = ["l", "kg", "tn", "unid"] as const;

export const entradaStockSchema = z.object({
  nombre: z.string().min(1, "Nombre del producto requerido"),
  categoria: z.string().min(1),
  unidad: z.string().min(1),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  precio: z.coerce.number().nonnegative().optional(),
  fecha: z.string().min(1, "Fecha obligatoria"),
  facturaId: z.string().optional(),
  obs: z.string().optional(),
});

export type EntradaStockActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export const ENTRADA_STOCK_ACTION_IDLE: EntradaStockActionState = {
  status: "idle",
};
