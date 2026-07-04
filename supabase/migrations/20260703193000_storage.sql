-- Bucket privado para las imágenes/PDFs de comprobantes de facturas — reemplaza el
-- base64 inline embebido en cada factura del HTML legacy (index_10.html:2524-2534).

insert into storage.buckets (id, name, public)
values ('facturas-imgs', 'facturas-imgs', false)
on conflict (id) do nothing;

-- Mismo criterio que el resto de las tablas operativas (ver 20260703191415_rls.sql):
-- cualquier usuario autenticado puede leer/escribir, sin distinción de rol.
create policy "authenticated_read_facturas_imgs" on storage.objects
  for select using (bucket_id = 'facturas-imgs' and auth.uid() is not null);

create policy "authenticated_write_facturas_imgs" on storage.objects
  for insert with check (bucket_id = 'facturas-imgs' and auth.uid() is not null);

create policy "authenticated_update_facturas_imgs" on storage.objects
  for update using (bucket_id = 'facturas-imgs' and auth.uid() is not null)
  with check (bucket_id = 'facturas-imgs' and auth.uid() is not null);

create policy "authenticated_delete_facturas_imgs" on storage.objects
  for delete using (bucket_id = 'facturas-imgs' and auth.uid() is not null);
