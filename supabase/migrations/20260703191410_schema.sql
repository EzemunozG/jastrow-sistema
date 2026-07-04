-- JASTROW: esquema relacional que reemplaza la tabla KV `jw_storage` del HTML legacy.
-- Ver ../../index_10.html y ../../ROADMAP.md para el detalle de cada dominio.

-- ============================================================================
-- FINCAS (normaliza el matching de string suelto 'LOTE4'/'VIRGINIA' del HTML legacy)
-- ============================================================================
create table fincas (
  id text primary key,
  nombre text not null
);
insert into fincas (id, nombre) values
  ('LOTE4', 'JASTROW - LOTE4'),
  ('VIRGINIA', 'JASTROW - LA VIRGINIA');

-- ============================================================================
-- PROFILES (reemplaza la tabla `users` en texto plano; vinculada a auth.users)
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);

-- Crea automáticamente un profile cuando se da de alta un usuario en auth.users
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================================
-- LOTES
-- ============================================================================
create table lotes (
  id text primary key,
  nombre text,
  ha numeric(8, 2) not null,
  tipo text not null check (tipo in ('Propio', 'Arrendado')),
  finca_id text references fincas (id),
  variedad text,
  soca int default 0,
  fecha_plantacion date,
  estado text not null default 'En cosecha' check (estado in ('Pendiente', 'En cosecha', 'Cosechado')),
  arriendo numeric default 0,          -- bolsas de 50kg / ha / año
  arriendo_obs text,
  lat numeric,
  lon numeric,
  propietario text,
  contrato text,
  obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- TRABAJOS (labores de campo) + INSUMOS
-- ============================================================================
create table trabajos (
  id uuid primary key default gen_random_uuid(),
  -- on update cascade: permite renombrar lotes.id (ej. corregir un ID de lote)
  -- sin dejar trabajos huérfanos, replicando la cascada manual de saveLoteModal()
  -- en index_10.html:2334.
  lote_id text references lotes (id) on update cascade on delete set null,
  fecha date not null,
  tipo text not null,
  ha numeric,
  empresa text,
  obs text,
  costo_labor numeric not null default 0,
  costo_insumos numeric not null default 0,
  costo_total numeric generated always as (costo_labor + costo_insumos) stored,
  created_at timestamptz not null default now()
);

create table facturas (
  id text primary key,
  numero text,
  tipo text,
  proveedor text,
  cuit text,
  fecha date not null,
  categoria text,
  obs text,
  total numeric not null,
  total_moneda text not null default 'ARS',
  img_path text,                       -- objeto en el bucket de Storage 'facturas-imgs'
  created_at timestamptz not null default now()
);

create table factura_items (
  id uuid primary key default gen_random_uuid(),
  factura_id text not null references facturas (id) on delete cascade,
  descripcion text,
  cantidad numeric,
  unidad text,
  precio_unit numeric,
  total numeric generated always as (cantidad * precio_unit) stored
);

create table trabajo_insumos (
  id uuid primary key default gen_random_uuid(),
  trabajo_id uuid not null references trabajos (id) on delete cascade,
  descripcion text,
  cantidad numeric,
  unidad text,
  precio_unit numeric,
  total numeric generated always as (cantidad * precio_unit) stored,
  factura_id text references facturas (id)
);

-- ============================================================================
-- STOCK: PRODUCTOS + MOVIMIENTOS
-- ============================================================================
create table productos (
  id text primary key,
  nombre text not null,
  categoria text,
  unidad text not null
);

create table recetas (
  id text primary key,
  nombre text,
  fecha date not null,
  tipo text,
  ha numeric,
  empresa text,
  obs text,
  costo_total numeric not null default 0,
  costo_ha numeric not null default 0,
  created_at timestamptz not null default now()
);

create table receta_lotes (
  receta_id text references recetas (id) on delete cascade,
  lote_id text references lotes (id) on update cascade on delete cascade,
  primary key (receta_id, lote_id)
);

create table receta_items (
  id uuid primary key default gen_random_uuid(),
  receta_id text not null references recetas (id) on delete cascade,
  producto_id text references productos (id),
  dosis numeric,
  unidad text,
  cantidad numeric,
  precio_unit numeric,
  total numeric generated always as (cantidad * precio_unit) stored
);

create table movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id text not null references productos (id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'salida')),
  fecha date not null,
  cantidad numeric not null,
  precio_unit numeric not null default 0,
  total numeric generated always as (cantidad * precio_unit) stored,
  origen text,
  obs text,
  receta_id text references recetas (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- INFRARUTS (datos del ingenio) — hoy hardcodeados en index_10.html, pasan a ser
-- una tabla real con historial de importaciones (novedad principal de este rewrite).
-- ============================================================================
create table infraruts_imports (
  id uuid primary key default gen_random_uuid(),
  filename text,
  uploaded_by uuid references profiles (id),
  uploaded_at timestamptz not null default now(),
  row_count int,
  status text not null default 'committed' check (status in ('committed', 'legacy_seed', 'reverted'))
);

create table infraruts (
  id uuid primary key default gen_random_uuid(),
  cp int not null unique,
  remito int,
  fecha date not null,
  finca_raw text not null,
  finca_id text references fincas (id),
  veh int,
  maq int,
  kg_neto numeric,
  kg_trash numeric,
  kg_azucar numeric,
  brix numeric,
  pol numeric,
  pureza numeric,
  rdto numeric,
  import_batch_id uuid references infraruts_imports (id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- LIBRETA DEL CAMPO (CPs emitidos desde el campo) + BAJAS ARCA
-- ============================================================================
create table cps_campo (
  cp int primary key,
  fecha date,
  camion text,
  obs text,
  finca_id text references fincas (id),
  created_by uuid references profiles (id),
  source text not null default 'manual' check (source in ('manual', 'excel_import', 'legacy_seed')),
  created_at timestamptz not null default now()
);

create table bajas_arca (
  cp int primary key,
  fecha date,
  motivo text,
  obs text,
  gestionado boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- CONFIGURACIÓN GLOBAL (reemplaza la clave escalar `precio_bolsa` + constantes
-- hardcodeadas TC_OFICIAL/TC_BLUE/TC_CCL del HTML legacy)
-- ============================================================================
create table app_settings (
  id smallint primary key default 1 check (id = 1),
  precio_bolsa numeric not null default 37000,
  tc_oficial numeric not null default 1490,
  tc_blue numeric not null default 1495,
  tc_ccl numeric not null default 1528,
  updated_at timestamptz not null default now()
);
insert into app_settings (id) values (1);
