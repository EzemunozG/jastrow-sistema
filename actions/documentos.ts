"use server";

import { revalidatePath } from "next/cache";
import { requireWriter } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { storagePath } from "@/lib/documentos";
import {
  documentoSchema,
  limpiarSelect,
  validarArchivo,
  type DocumentoActionState,
} from "@/lib/forms/documentos";

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = ((v as string) ?? "").trim();
  return s === "" ? null : s;
}

function emptyToUndefined(v: FormDataEntryValue | null): string | undefined {
  const s = ((v as string) ?? "").trim();
  return s === "" ? undefined : s;
}

export async function saveDocumento(
  _prevState: DocumentoActionState,
  formData: FormData,
): Promise<DocumentoActionState> {
  await requireWriter();

  const parsed = documentoSchema.safeParse({
    idOriginal: emptyToUndefined(formData.get("idOriginal")),
    titulo: formData.get("titulo"),
    tipo: formData.get("tipo"),
    fecha: emptyToUndefined(formData.get("fecha")),
    autor: emptyToUndefined(formData.get("autor")),
    resumen: emptyToUndefined(formData.get("resumen")),
    lote_key: limpiarSelect(emptyToUndefined(formData.get("lote_key"))),
    ingenio_id: limpiarSelect(emptyToUndefined(formData.get("ingenio_id"))),
    obs: emptyToUndefined(formData.get("obs")),
    existingArchivoPath: emptyToUndefined(formData.get("existingArchivoPath")),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { idOriginal, existingArchivoPath, ...rest } = parsed.data;

  const supabase = await createClient();

  // El archivo se sube ANTES de escribir la fila: si falla la subida, no queda una
  // fila apuntando a un archivo que no existe. Al revés (fila primero) el error
  // dejaría un documento con botón de descarga roto.
  let archivo_path = existingArchivoPath ?? null;
  const file = formData.get("archivo");
  if (file instanceof File && file.size > 0) {
    const invalido = validarArchivo(file.name, file.size);
    if (invalido) return { status: "error", error: invalido };

    const path = storagePath(rest.tipo, file.name, Date.now());
    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (uploadError) return { status: "error", error: uploadError.message };
    archivo_path = path;
  }

  const fila = {
    titulo: rest.titulo,
    tipo: rest.tipo,
    fecha: emptyToNull(rest.fecha ?? null),
    autor: emptyToNull(rest.autor ?? null),
    resumen: emptyToNull(rest.resumen ?? null),
    lote_key: emptyToNull(rest.lote_key ?? null),
    ingenio_id: emptyToNull(rest.ingenio_id ?? null),
    obs: emptyToNull(rest.obs ?? null),
    archivo_path,
  };

  const { error } = idOriginal
    ? await supabase.from("documentos").update(fila).eq("id", idOriginal)
    : await supabase.from("documentos").insert(fila);
  if (error) return { status: "error", error: error.message };

  revalidatePath("/documentos");
  return { status: "success" };
}

export async function deleteDocumento(id: string, archivoPath: string | null) {
  await requireWriter();
  const supabase = await createClient();
  // El archivo primero: si se borrara la fila y fallara el remove, el objeto quedaría
  // en el bucket sin nada que lo referencie (invisible y ocupando lugar).
  if (archivoPath) {
    await supabase.storage.from("documentos").remove([archivoPath]);
  }
  await supabase.from("documentos").delete().eq("id", id);
  revalidatePath("/documentos");
}
