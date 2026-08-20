// Schema, tipos y estado inicial del form de Documentos. Vive fuera de
// actions/documentos.ts porque un archivo "use server" solo puede exportar funciones
// async — cualquier const/schema exportado ahí revienta en runtime (ver CLAUDE.md).
import { z } from "zod";

// Los ids tienen que coincidir con el check constraint de la tabla
// (supabase/migrations/20260820000000_documentos.sql): agregar un tipo acá sin
// agregarlo allá hace fallar el insert con un error de constraint.
export const DOCUMENTO_TIPOS = [
  { id: "informe_agronomico", label: "Informe agronómico" },
  { id: "liquidacion", label: "Liquidación de maquila" },
  { id: "factura", label: "Factura" },
  { id: "analisis_suelo", label: "Análisis de suelo" },
  { id: "contrato", label: "Contrato" },
  { id: "orden_maquila", label: "Orden de maquila" },
  { id: "otro", label: "Otro" },
] as const;

export type DocumentoTipo = (typeof DOCUMENTO_TIPOS)[number]["id"];

const TIPO_IDS = DOCUMENTO_TIPOS.map((t) => t.id) as [
  DocumentoTipo,
  ...DocumentoTipo[],
];

export function esTipoConocido(tipo: string): tipo is DocumentoTipo {
  return DOCUMENTO_TIPOS.some((t) => t.id === tipo);
}

export function tipoLabel(tipo: string): string {
  return DOCUMENTO_TIPOS.find((t) => t.id === tipo)?.label ?? tipo;
}

// Extensiones aceptadas. Se valida por extensión y no por MIME type porque el
// navegador manda cualquier cosa en el Content-Type de un .xls viejo
// (application/octet-stream) y rechazaría archivos legítimos.
export const EXTENSIONES_PERMITIDAS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "jpg",
  "jpeg",
  "png",
] as const;

// Para el atributo `accept` del input y del drop zone.
export const ACCEPT_ATTR = EXTENSIONES_PERMITIDAS.map((e) => `.${e}`).join(",");

// 25 MB. Un informe agronómico escaneado ronda los 5–10 MB; el límite está para
// atajar el video o el ZIP que alguien arrastre por error, no para apretar al usuario.
export const MAX_ARCHIVO_MB = 25;
export const MAX_ARCHIVO_BYTES = MAX_ARCHIVO_MB * 1024 * 1024;

// Radix Select no acepta un <SelectItem value="">, así que la opción "— Ninguno —" de
// Lote e Ingenio manda este centinela. Lo tiene que conocer también la Server Action:
// si no lo limpiara, guardaría el literal "__none__" como lote_key y el documento
// aparecería con un chip de un lote inexistente.
export const SIN_VALOR = "__none__";

export function limpiarSelect(v: string | undefined): string | undefined {
  return v === SIN_VALOR ? undefined : v;
}

export const documentoSchema = z.object({
  idOriginal: z.string().optional(),
  titulo: z.string().trim().min(1, "El título es obligatorio"),
  tipo: z.enum(TIPO_IDS),
  fecha: z.string().optional(),
  autor: z.string().optional(),
  resumen: z.string().optional(),
  lote_key: z.string().optional(),
  ingenio_id: z.string().optional(),
  obs: z.string().optional(),
  existingArchivoPath: z.string().optional(),
});

export type DocumentoFormValues = z.input<typeof documentoSchema>;

export type DocumentoActionState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success" };

export const DOCUMENTO_ACTION_IDLE: DocumentoActionState = { status: "idle" };

// Validación del archivo, compartida por el cliente (feedback inmediato al soltarlo)
// y por la Server Action (que es donde realmente cuenta). Devuelve el mensaje de
// error, o null si el archivo está bien.
export function validarArchivo(
  nombre: string,
  bytes: number,
): string | null {
  const ext = (/\.([a-zA-Z0-9]+)$/.exec(nombre)?.[1] ?? "").toLowerCase();
  if (!ext) return "El archivo no tiene extensión — no se puede identificar el formato.";
  if (!(EXTENSIONES_PERMITIDAS as readonly string[]).includes(ext)) {
    return `Formato .${ext} no admitido. Se aceptan: ${EXTENSIONES_PERMITIDAS.join(", ")}.`;
  }
  if (bytes > MAX_ARCHIVO_BYTES) {
    const mb = (bytes / 1024 / 1024).toFixed(1).replace(".", ",");
    return `El archivo pesa ${mb} MB y el máximo es ${MAX_ARCHIVO_MB} MB.`;
  }
  return null;
}
