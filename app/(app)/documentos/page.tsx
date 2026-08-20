export const dynamic = "force-dynamic";

import { DocumentosView } from "@/components/documentos/documentos-view";
import { INGENIOS } from "@/lib/business-rules";
import {
  contarPorTipo,
  filtrarDocumentos,
  listarDocumentos,
  parseDocFiltros,
  type DocumentoConUrl,
  type DocumentoRow,
  type SearchParamsInput,
} from "@/lib/documentos";
import { createClient } from "@/lib/supabase/server";

// Vida de las URLs firmadas del bucket privado. Una hora alcanza de sobra para abrir o
// bajar el archivo y hace que un link copiado por accidente no sirva para siempre.
const SIGNED_URL_TTL = 3600;

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const filtros = parseDocFiltros(
    await searchParams,
    INGENIOS.map((i) => i.id),
  );

  const supabase = await createClient();
  const [{ data: docsData }, { data: lotesIngenio }] = await Promise.all([
    supabase.from("documentos").select("*"),
    supabase.from("lotes_ingenio").select("lote_key, nombre"),
  ]);

  const documentos: DocumentoRow[] = docsData ?? [];
  const visibles = listarDocumentos(documentos, filtros);

  // Una sola llamada para firmar todas las URLs de la página, en vez de un
  // createSignedUrl por fila (que es lo que hace /campo/facturas y le cuesta un
  // round-trip por factura). Las filas sin archivo no se mandan a firmar.
  const paths = visibles
    .map((d) => d.archivo_path)
    .filter((p): p is string => p != null);
  const urlPorPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: firmadas } = await supabase.storage
      .from("documentos")
      .createSignedUrls(paths, SIGNED_URL_TTL);
    for (const f of firmadas ?? []) {
      if (f.path && f.signedUrl) urlPorPath.set(f.path, f.signedUrl);
    }
  }

  const conUrl: DocumentoConUrl[] = visibles.map((d) => ({
    ...d,
    url: d.archivo_path ? (urlPorPath.get(d.archivo_path) ?? null) : null,
  }));

  // Conteo por tipo respetando el filtro de ingenio pero NO el de tipo: si contara el
  // tipo también, todos los tipos menos el elegido mostrarían (0).
  const conteos = contarPorTipo(
    filtrarDocumentos(documentos, { ...filtros, tipo: "all" }),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Documentos</h1>
        <p className="text-sm text-muted-foreground">
          El archivo del campo: informes agronómicos, liquidaciones de maquila,
          facturas, análisis de suelo, contratos y órdenes de maquila. Cada documento
          guarda el archivo original — cuando un número no cierra, acá está el papel
          que lo respalda.
        </p>
      </div>

      <DocumentosView
        documentos={conUrl}
        filtros={filtros}
        conteos={conteos}
        lotes={(lotesIngenio ?? []).map((l) => ({
          lote_key: l.lote_key,
          nombre: l.nombre,
        }))}
        ingenios={INGENIOS.map((i) => ({ id: i.id, nombre: i.nombre }))}
        hayDocumentos={documentos.length > 0}
      />
    </div>
  );
}
