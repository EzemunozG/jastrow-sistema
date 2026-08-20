-- Bucket privado para los archivos de la tabla `documentos`
-- (ver 20260820000000_documentos.sql). Privado: la app nunca sirve una URL pública,
-- genera signed URLs de corta duración desde el server (ver app/(app)/documentos/page.tsx).

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Las policies del bucket van ALINEADAS con el RLS de la tabla, no con el criterio más
-- viejo de 'facturas-imgs' (que deja escribir a cualquier autenticado, de antes de que
-- existiera el rol viewer): leer cualquier autenticado, escribir/borrar cualquiera que
-- no sea viewer. Si no se alinearan, un viewer no podría crear la fila pero sí dejar
-- archivos huérfanos en el bucket.
--
-- `public.is_viewer()` va con el schema explícito: estas policies se evalúan sobre
-- storage.objects, donde no se puede contar con que `public` esté en el search_path.
create policy "authenticated_read_documentos_bucket" on storage.objects
  for select using (
    bucket_id = 'documentos' and auth.uid() is not null
  );

create policy "writer_insert_documentos_bucket" on storage.objects
  for insert with check (
    bucket_id = 'documentos' and auth.uid() is not null and not public.is_viewer()
  );

-- UPDATE además de INSERT: el upload de la app va con `upsert: true`, y reemplazar un
-- objeto existente pide permiso de update, no solo de insert.
create policy "writer_update_documentos_bucket" on storage.objects
  for update using (
    bucket_id = 'documentos' and auth.uid() is not null and not public.is_viewer()
  ) with check (
    bucket_id = 'documentos' and auth.uid() is not null and not public.is_viewer()
  );

create policy "writer_delete_documentos_bucket" on storage.objects
  for delete using (
    bucket_id = 'documentos' and auth.uid() is not null and not public.is_viewer()
  );
