-- Segunda línea de defensa para el rol 'viewer' (ver requireWriter() en lib/dal.ts,
-- que ya es el límite de confianza real en cada Server Action) — RLS bloquea
-- INSERT/UPDATE/DELETE también si alguien le pega a la API de Supabase directo con
-- la anon key + el JWT de un viewer, sin pasar por las Server Actions.
--
-- infraruts/infraruts_imports ya tenían este patrón split-by-verb (solo admin puede
-- escribir, ver 20260703191415_rls.sql) — se generaliza el mismo patrón a las 14
-- tablas que hoy comparten la policy catch-all "authenticated_all_<tabla>" (cualquier
-- autenticado, full CRUD), reemplazándola por: lectura para cualquier autenticado,
-- escritura para cualquier autenticado que NO sea viewer.

create or replace function is_viewer()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'viewer'
  );
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'fincas', 'lotes', 'trabajos', 'trabajo_insumos', 'facturas', 'factura_items',
    'productos', 'movimientos_stock', 'recetas', 'receta_lotes', 'receta_items',
    'cps_campo', 'bajas_arca', 'app_settings'
  ]
  loop
    execute format('drop policy if exists "authenticated_all_%1$s" on %1$s', t);

    execute format(
      'create policy "authenticated_read_%1$s" on %1$s
       for select using (auth.uid() is not null)',
      t
    );
    execute format(
      'create policy "writer_insert_%1$s" on %1$s
       for insert with check (auth.uid() is not null and not is_viewer())',
      t
    );
    execute format(
      'create policy "writer_update_%1$s" on %1$s
       for update using (auth.uid() is not null and not is_viewer())
       with check (auth.uid() is not null and not is_viewer())',
      t
    );
    execute format(
      'create policy "writer_delete_%1$s" on %1$s
       for delete using (auth.uid() is not null and not is_viewer())',
      t
    );
  end loop;
end $$;

-- profiles: un viewer no debe poder ni siquiera actualizar su propia fila (username).
alter policy "self_update_profile" on profiles
  using (auth.uid() = id and not is_viewer())
  with check (
    auth.uid() = id and not is_viewer()
    and role = (select role from profiles where id = auth.uid())
  );

-- Storage (facturas-imgs, ver 20260703193000_storage.sql): mismo criterio, un viewer
-- no debe poder subir/reemplazar/borrar comprobantes aunque le pegue a la API de
-- Storage directo.
alter policy "authenticated_write_facturas_imgs" on storage.objects
  with check (bucket_id = 'facturas-imgs' and auth.uid() is not null and not is_viewer());

alter policy "authenticated_update_facturas_imgs" on storage.objects
  using (bucket_id = 'facturas-imgs' and auth.uid() is not null and not is_viewer())
  with check (bucket_id = 'facturas-imgs' and auth.uid() is not null and not is_viewer());

alter policy "authenticated_delete_facturas_imgs" on storage.objects
  using (bucket_id = 'facturas-imgs' and auth.uid() is not null and not is_viewer());
