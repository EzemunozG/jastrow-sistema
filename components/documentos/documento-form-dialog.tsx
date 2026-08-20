"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconFile, IconUpload, IconX } from "@tabler/icons-react";
import { saveDocumento } from "@/actions/documentos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { nombreArchivo, type DocumentoRow } from "@/lib/documentos";
import {
  ACCEPT_ATTR,
  DOCUMENTO_ACTION_IDLE,
  DOCUMENTO_TIPOS,
  MAX_ARCHIVO_MB,
  SIN_VALOR,
  validarArchivo,
} from "@/lib/forms/documentos";

export type LoteOpcion = { lote_key: string; nombre: string };
export type IngenioOpcion = { id: string; nombre: string };

// Zona de drop que alimenta a un <input type="file"> real: el form sigue siendo un
// form nativo con Server Action (no hay que subir el archivo por otra vía), y el drag
// & drop solo le asigna los archivos al input vía DataTransfer.
function DropZone({
  onError,
  nombreExistente,
}: {
  onError: (msg: string | null) => void;
  nombreExistente: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [elegido, setElegido] = useState<string | null>(null);

  function aceptar(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const invalido = validarArchivo(file.name, file.size);
    if (invalido) {
      onError(invalido);
      setElegido(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onError(null);
    setElegido(file.name);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="archivo">
        Archivo {nombreExistente ? "(reemplazar)" : "(opcional)"}
      </Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          // Le pasamos los archivos soltados al input nativo: así el submit del form
          // los manda igual que si el usuario hubiera usado el botón.
          if (inputRef.current && e.dataTransfer.files.length > 0) {
            inputRef.current.files = e.dataTransfer.files;
            aceptar(e.dataTransfer.files);
          }
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
          dragging
            ? "border-brand bg-brand/5"
            : "border-border hover:border-brand/40 hover:bg-muted"
        }`}
      >
        <IconUpload size={22} className="text-muted-foreground" />
        <p className="text-sm">
          Arrastrá el archivo acá o <span className="font-medium text-brand">buscalo</span>
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, Word, Excel o imagen · hasta {MAX_ARCHIVO_MB} MB
        </p>
        {elegido && (
          <p className="mt-1 flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
            <IconFile size={13} />
            {elegido}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        id="archivo"
        name="archivo"
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => aceptar(e.target.files)}
      />
      {nombreExistente && !elegido && (
        <p className="text-xs text-muted-foreground">
          Ya hay un archivo cargado ({nombreExistente}) — soltá uno nuevo solo si
          querés reemplazarlo.
        </p>
      )}
    </div>
  );
}

export function DocumentoFormDialog({
  documento,
  lotes,
  ingenios,
  open,
  onOpenChange,
}: {
  documento?: DocumentoRow | null;
  lotes: LoteOpcion[];
  ingenios: IngenioOpcion[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    saveDocumento,
    DOCUMENTO_ACTION_IDLE,
  );
  // Error de archivo detectado en el cliente (formato/tamaño). Es solo para no hacer
  // viajar 30 MB al server antes de rechazarlos — la validación que cuenta está en la
  // Server Action, que corre el mismo validarArchivo().
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [state, onOpenChange]);

  const error = errorArchivo ?? (state.status === "error" ? state.error : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {documento ? "Editar documento" : "Subir documento"}
          </DialogTitle>
        </DialogHeader>

        <form action={action} className="space-y-4">
          {documento && (
            <input type="hidden" name="idOriginal" value={documento.id} />
          )}
          {documento?.archivo_path && (
            <input
              type="hidden"
              name="existingArchivoPath"
              value={documento.archivo_path}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                name="titulo"
                defaultValue={documento?.titulo ?? ""}
                placeholder="Ej: Informe agronómico Frau — julio 2026"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                name="tipo"
                defaultValue={documento?.tipo ?? DOCUMENTO_TIPOS[0].id}
              >
                <SelectTrigger id="tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENTO_TIPOS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha del documento</Label>
              <Input
                id="fecha"
                name="fecha"
                type="date"
                defaultValue={documento?.fecha ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="autor">Autor / emisor</Label>
              <Input
                id="autor"
                name="autor"
                defaultValue={documento?.autor ?? ""}
                placeholder="Ing. agrónomo, ingenio, estudio…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ingenio_id">Ingenio</Label>
              <Select
                name="ingenio_id"
                defaultValue={documento?.ingenio_id ?? SIN_VALOR}
              >
                <SelectTrigger id="ingenio_id" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>— Ninguno —</SelectItem>
                  {ingenios.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="lote_key">Lote</Label>
              <Select
                name="lote_key"
                defaultValue={documento?.lote_key ?? SIN_VALOR}
              >
                <SelectTrigger id="lote_key" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VALOR}>— Ninguno —</SelectItem>
                  {lotes.map((l) => (
                    <SelectItem key={l.lote_key} value={l.lote_key}>
                      {l.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="resumen">Resumen</Label>
              <Textarea
                id="resumen"
                name="resumen"
                rows={2}
                defaultValue={documento?.resumen ?? ""}
                placeholder="Dos líneas sobre qué dice el documento, para no tener que abrirlo…"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="obs">Observaciones</Label>
              <Textarea
                id="obs"
                name="obs"
                rows={2}
                defaultValue={documento?.obs ?? ""}
              />
            </div>
          </div>

          <div className="border-t pt-3">
            <DropZone
              onError={setErrorArchivo}
              nombreExistente={nombreArchivo(documento?.archivo_path)}
            />
          </div>

          {error && (
            <p className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
              <IconX size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending || errorArchivo != null}>
              {pending ? "Guardando…" : "Guardar documento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
