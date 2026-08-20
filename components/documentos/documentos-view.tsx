"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  IconDownload,
  IconFileOff,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { FolderOpen } from "lucide-react";
import { deleteDocumento } from "@/actions/documentos";
import { useCanWrite } from "@/components/providers/role-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  countDocFiltrosActivos,
  nombreArchivo,
  type DocFiltros,
  type DocumentoConUrl,
} from "@/lib/documentos";
import { DOCUMENTO_TIPOS, tipoLabel } from "@/lib/forms/documentos";
import { formatFecha } from "@/lib/format";
import {
  DocumentoFormDialog,
  type IngenioOpcion,
  type LoteOpcion,
} from "./documento-form-dialog";

// Un color por tipo, para poder barrer el listado con la vista sin leer cada chip.
const TIPO_CHIP: Record<string, string> = {
  informe_agronomico:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  liquidacion: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  factura: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  analisis_suelo:
    "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  contrato: "bg-cyan-100 text-cyan-900 dark:bg-cyan-500/15 dark:text-cyan-300",
  orden_maquila:
    "bg-orange-100 text-orange-900 dark:bg-orange-500/15 dark:text-orange-300",
  otro: "bg-muted text-muted-foreground",
};

const CHIP_NEUTRO =
  "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground";

const TODOS = "all";

function Filtros({
  filtros,
  ingenios,
  conteos,
}: {
  filtros: DocFiltros;
  ingenios: IngenioOpcion[];
  conteos: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Igual que components/filters/filter-bar.tsx: el estado de los filtros vive en la
  // URL (compartible, sobrevive un refresh) y el filtrado real lo hace el server.
  function push(patch: Partial<DocFiltros>) {
    const next = { ...filtros, ...patch };
    const params = new URLSearchParams();
    if (next.tipo !== TODOS) params.set("tipo", next.tipo);
    if (next.ingenio !== TODOS) params.set("ingenio", next.ingenio);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const activos = countDocFiltrosActivos(filtros);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Tipo</label>
        <Select
          value={filtros.tipo}
          onValueChange={(v) => push({ tipo: v as DocFiltros["tipo"] })}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los tipos</SelectItem>
            {DOCUMENTO_TIPOS.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
                {conteos[t.id] ? ` (${conteos[t.id]})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Ingenio</label>
        <Select value={filtros.ingenio} onValueChange={(v) => push({ ingenio: v })}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
            {ingenios.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activos > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          Limpiar filtros ({activos})
        </Button>
      )}
    </div>
  );
}

function Fila({
  doc,
  loteNombre,
  ingenioNombre,
  canWrite,
  onEdit,
}: {
  doc: DocumentoConUrl;
  loteNombre: (key: string) => string;
  ingenioNombre: (id: string) => string;
  canWrite: boolean;
  onEdit: (doc: DocumentoConUrl) => void;
}) {
  const [borrando, setBorrando] = useState(false);
  const archivo = nombreArchivo(doc.archivo_path);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b p-3.5 last:border-0 hover:bg-muted/60">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
              TIPO_CHIP[doc.tipo] ?? TIPO_CHIP.otro
            }`}
          >
            {tipoLabel(doc.tipo)}
          </span>
          <h3 className="text-sm font-semibold">{doc.titulo}</h3>
        </div>

        <p className="text-xs text-muted-foreground">
          {formatFecha(doc.fecha)}
          {doc.autor && ` · ${doc.autor}`}
          {archivo && ` · ${archivo}`}
        </p>

        {doc.resumen && <p className="text-sm text-muted-foreground">{doc.resumen}</p>}

        {(doc.lote_key || doc.ingenio_id) && (
          <div className="flex flex-wrap gap-1.5">
            {doc.lote_key && (
              <span className={CHIP_NEUTRO}>Lote {loteNombre(doc.lote_key)}</span>
            )}
            {doc.ingenio_id && (
              <span className={CHIP_NEUTRO}>{ingenioNombre(doc.ingenio_id)}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {doc.url ? (
          <Button asChild variant="outline" size="sm">
            <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
              <IconDownload size={14} /> Descargar
            </a>
          </Button>
        ) : (
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title="Este documento está registrado pero todavía no tiene el archivo cargado"
          >
            <IconFileOff size={14} /> Sin archivo
          </span>
        )}

        {canWrite && (
          <>
            <Button variant="outline" size="sm" onClick={() => onEdit(doc)}>
              <IconPencil size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={borrando}
              onClick={async () => {
                setBorrando(true);
                try {
                  await deleteDocumento(doc.id, doc.archivo_path);
                } finally {
                  setBorrando(false);
                }
              }}
            >
              <IconTrash size={14} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function DocumentosView({
  documentos,
  filtros,
  conteos,
  lotes,
  ingenios,
  hayDocumentos,
}: {
  documentos: DocumentoConUrl[];
  filtros: DocFiltros;
  conteos: Record<string, number>;
  lotes: LoteOpcion[];
  ingenios: IngenioOpcion[];
  // Si hay documentos cargados en el sistema aunque los filtros actuales no devuelvan
  // ninguno: cambia el empty state de "no hay nada" a "no hay nada con estos filtros".
  hayDocumentos: boolean;
}) {
  const canWrite = useCanWrite();
  const [selected, setSelected] = useState<DocumentoConUrl | null>(null);
  const [open, setOpen] = useState(false);
  // Remonta el diálogo en cada apertura para que no quede pegado el documento anterior
  // en el form (mismo patrón que FacturasTable).
  const [dialogKey, setDialogKey] = useState(0);

  function abrir(doc: DocumentoConUrl | null) {
    setSelected(doc);
    setDialogKey((k) => k + 1);
    setOpen(true);
  }

  const loteNombre = (key: string) =>
    lotes.find((l) => l.lote_key === key)?.nombre ?? key;
  const ingenioNombre = (id: string) =>
    ingenios.find((i) => i.id === id)?.nombre ?? id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filtros filtros={filtros} ingenios={ingenios} conteos={conteos} />
        {canWrite && (
          <Button onClick={() => abrir(null)}>
            <IconPlus size={15} /> Subir documento
          </Button>
        )}
      </div>

      {documentos.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={
            hayDocumentos
              ? "Ningún documento coincide con estos filtros"
              : "Todavía no hay documentos cargados"
          }
          description={
            hayDocumentos
              ? "Probá con otro tipo o sacando el filtro de ingenio."
              : canWrite
                ? "Subí el primero con el botón de arriba: informes del asesor, liquidaciones del ingenio, contratos, órdenes de maquila."
                : "Cuando se carguen documentos van a aparecer acá para descargar."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          {documentos.map((doc) => (
            <Fila
              key={doc.id}
              doc={doc}
              loteNombre={loteNombre}
              ingenioNombre={ingenioNombre}
              canWrite={canWrite}
              onEdit={abrir}
            />
          ))}
        </div>
      )}

      {canWrite && (
        <DocumentoFormDialog
          key={dialogKey}
          documento={selected}
          lotes={lotes}
          ingenios={ingenios}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </div>
  );
}
