// Listado de documentos: filtros, orden y utilidades de archivo. Todo funciones puras
// — la page.tsx solo fetchea, genera las signed URLs y llama a estas.
//
// Los tipos de documento y el schema del form viven en lib/forms/documentos.ts (un
// archivo "use server" no puede exportar constantes, ver CLAUDE.md), y se re-exportan
// desde acá para que una pantalla no tenga que importar de los dos lados.

import type { DocumentoTipo } from "./forms/documentos";
import { DOCUMENTO_TIPOS, esTipoConocido } from "./forms/documentos";

export type DocumentoRow = {
  id: string;
  fecha: string | null;
  tipo: string;
  titulo: string;
  autor: string | null;
  resumen: string | null;
  archivo_path: string | null;
  lote_key: string | null;
  ingenio_id: string | null;
  obs: string | null;
};

// Fila lista para la UI: la signed URL se genera en el server (el bucket es privado) y
// viaja con la fila. `null` = documento sin archivo todavía, o el archivo no se pudo
// firmar — en los dos casos la fila se muestra igual, sin botón de descarga.
export type DocumentoConUrl = DocumentoRow & { url: string | null };

export type DocFiltros = {
  tipo: DocumentoTipo | "all";
  ingenio: string | "all";
};

export type SearchParamsInput = Record<string, string | string[] | undefined>;

export function parseDocFiltros(
  searchParams: SearchParamsInput,
  ingeniosValidos: readonly string[],
): DocFiltros {
  const get = (k: string): string => {
    const v = searchParams[k];
    return typeof v === "string" ? v : "";
  };
  const tipoRaw = get("tipo");
  const ingenioRaw = get("ingenio");
  return {
    tipo: esTipoConocido(tipoRaw) ? tipoRaw : "all",
    ingenio: ingeniosValidos.includes(ingenioRaw) ? ingenioRaw : "all",
  };
}

export function countDocFiltrosActivos(f: DocFiltros): number {
  return [f.tipo !== "all", f.ingenio !== "all"].filter(Boolean).length;
}

// Orden del listado: fecha descendente. Un documento sin fecha va AL FINAL en vez de
// arriba — ordenar strings dejaría el null en una punta arbitraria, y arriba de todo
// es justo donde más molesta (ver la trampa ya pisada con infraruts.fecha en
// CLAUDE.md). Empate de fecha: desempata por título para que el orden sea estable.
export function ordenarDocumentos(docs: DocumentoRow[]): DocumentoRow[] {
  return [...docs].sort((a, b) => {
    if (a.fecha == null && b.fecha == null) return a.titulo.localeCompare(b.titulo, "es");
    if (a.fecha == null) return 1;
    if (b.fecha == null) return -1;
    if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
    return a.titulo.localeCompare(b.titulo, "es");
  });
}

// Filtra por tipo e ingenio. Un documento SIN ingenio_id (un contrato general, un
// informe del asesor que no es de ningún ingenio) queda fuera al filtrar por un
// ingenio concreto: se está pidiendo "los de Trinidad", y uno sin ingenio no lo es.
export function filtrarDocumentos<T extends DocumentoRow>(
  docs: T[],
  f: DocFiltros,
): T[] {
  return docs.filter((d) => {
    if (f.tipo !== "all" && d.tipo !== f.tipo) return false;
    if (f.ingenio !== "all" && d.ingenio_id !== f.ingenio) return false;
    return true;
  });
}

export function listarDocumentos<T extends DocumentoRow>(
  docs: T[],
  f: DocFiltros,
): T[] {
  return ordenarDocumentos(filtrarDocumentos(docs, f)) as T[];
}

// Cuántos documentos hay de cada tipo, para mostrar el conteo al lado del filtro. Se
// cuenta sobre la lista SIN filtrar por tipo (pero sí por ingenio), si no el conteo de
// los tipos no seleccionados daría siempre 0.
export function contarPorTipo(docs: DocumentoRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of docs) out[d.tipo] = (out[d.tipo] ?? 0) + 1;
  return out;
}

// ── Archivos ────────────────────────────────────────────────────────────────

// "informe_agronomico/1755..._Informe Frau.pdf" → "Informe Frau.pdf". Lo que se
// muestra al lado del botón de descarga; el prefijo de carpeta y el timestamp que se
// agregan para evitar colisiones no le interesan a nadie.
export function nombreArchivo(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = path.split("/").pop() ?? path;
  return base.replace(/^\d+_/, "");
}

export function extensionDe(nombre: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(nombre);
  return m ? m[1].toLowerCase() : "";
}

// Key dentro del bucket. Se antepone el tipo (carpeta) y un timestamp para que dos
// archivos con el mismo nombre no se pisen, y se limpia el nombre: Supabase Storage
// acepta bastante, pero los acentos y espacios complican las URLs firmadas y el
// debugging desde el dashboard.
export function sanitizarNombreArchivo(nombre: string): string {
  const ext = extensionDe(nombre);
  const base = (ext ? nombre.slice(0, -(ext.length + 1)) : nombre)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  const limpio = base || "archivo";
  return ext ? `${limpio}.${ext}` : limpio;
}

export function storagePath(tipo: string, nombre: string, ahora: number): string {
  return `${tipo}/${ahora}_${sanitizarNombreArchivo(nombre)}`;
}

export { DOCUMENTO_TIPOS, esTipoConocido };
export type { DocumentoTipo };
