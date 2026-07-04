-- Row Level Security: reemplaza el enforcement 100% client-side del HTML legacy
-- (login = comparación de strings en el navegador, clave anon con acceso total a la tabla
-- jw_storage sin RLS) por permisos reales del lado del servidor.

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and not disabled
  );
$$;

-- ============================================================================
-- Tablas operativas: cualquier usuario autenticado puede leer/escribir, igual que
-- hoy (el rol 'user' en el HTML legacy solo oculta el panel de admin en la UI,
-- no restringe el acceso a datos de negocio — se preserva ese comportamiento).
-- ============================================================================
alter table fincas enable row level security;
alter table lotes enable row level security;
alter table trabajos enable row level security;
alter table trabajo_insumos enable row level security;
alter table facturas enable row level security;
alter table factura_items enable row level security;
alter table productos enable row level security;
alter table movimientos_stock enable row level security;
alter table recetas enable row level security;
alter table receta_lotes enable row level security;
alter table receta_items enable row level security;
alter table cps_campo enable row level security;
alter table bajas_arca enable row level security;
alter table app_settings enable row level security;

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
    execute format(
      'create policy "authenticated_all_%1$s" on %1$s for all
       using (auth.uid() is not null) with check (auth.uid() is not null)',
      t
    );
  end loop;
end $$;

-- ============================================================================
-- INFRARUTS / INFRARUTS_IMPORTS: la única restricción nueva respecto al HTML legacy.
-- Antes NADIE podía editar estos datos sin tocar el código fuente; ahora los usuarios
-- normales tienen solo lectura y los admins pueden importar/corregir.
-- ============================================================================
alter table infraruts enable row level security;
alter table infraruts_imports enable row level security;

create policy "authenticated_read_infraruts" on infraruts
  for select using (auth.uid() is not null);
create policy "admin_write_infraruts" on infraruts
  for insert with check (is_admin());
create policy "admin_update_infraruts" on infraruts
  for update using (is_admin()) with check (is_admin());
create policy "admin_delete_infraruts" on infraruts
  for delete using (is_admin());

create policy "authenticated_read_infraruts_imports" on infraruts_imports
  for select using (auth.uid() is not null);
create policy "admin_write_infraruts_imports" on infraruts_imports
  for insert with check (is_admin());
create policy "admin_delete_infraruts_imports" on infraruts_imports
  for delete using (is_admin());

-- ============================================================================
-- PROFILES: todo usuario autenticado puede ver la lista (para mostrar usernames),
-- pero solo un admin puede cambiar rol/disabled de otro usuario. Cada usuario puede
-- actualizar sus propias columnas no sensibles.
-- ============================================================================
alter table profiles enable row level security;

create policy "authenticated_read_profiles" on profiles
  for select using (auth.uid() is not null);

create policy "self_update_profile" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));

create policy "admin_update_any_profile" on profiles
  for update using (is_admin()) with check (is_admin());

create policy "admin_insert_profile" on profiles
  for insert with check (is_admin() or auth.uid() = id);
