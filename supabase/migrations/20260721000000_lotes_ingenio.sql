-- Metadata de lotes (hectáreas, surcos/ha) para calcular rendimiento por lote en la
-- página de Reconciliación. Tabla nueva y distinta de `lotes` (que ya existe: parcelas
-- físicas para arriendo/costos, con su propio esquema — tipo, estado, contrato — y
-- referenciada por receta_lotes). `lotes_ingenio.lote_key` matchea el texto libre de
-- `cps_campo.lote` (ver supabase/migrations/20260716000000_cps_campo_lote.sql), que
-- agrupa despachos de la libreta por lote de origen, no por parcela física individual.
create table if not exists lotes_ingenio (
  id text primary key,
  nombre text not null,
  ingenio_id text not null references ingenios(id),
  lote_key text not null, -- matchea cps_campo.lote
  ha numeric not null,
  surcos_por_ha int not null default 61,
  propietario text,
  obs text,
  created_at timestamptz not null default now()
);

alter table lotes_ingenio enable row level security;

create policy "authenticated_read_lotes_ingenio" on lotes_ingenio
  for select using (auth.uid() is not null);
create policy "admin_write_lotes_ingenio" on lotes_ingenio
  for insert with check (is_admin());
create policy "admin_update_lotes_ingenio" on lotes_ingenio
  for update using (is_admin()) with check (is_admin());
create policy "admin_delete_lotes_ingenio" on lotes_ingenio
  for delete using (is_admin());

-- Hectareajes confirmados por el usuario (2026-07-21) — reemplaza un primer intento de
-- esta migración que solo tenía 6 de los 11 lotes (a 'PILOT' y a los 4 de Concepción
-- distintos de 'LAS 101' les faltaba hectareaje real; 'LAS 101' se había estimado por
-- suma de parcelas físicas de la tabla `lotes`, ver git history de este archivo). El
-- usuario terminó cargando los 11 directamente por el SQL editor del dashboard con
-- estos mismos ids/valores — este archivo se corrige acá para que coincida con lo que
-- ya está en la base y quede como fuente de verdad reproducible.
insert into lotes_ingenio (id, nombre, ingenio_id, lote_key, ha, propietario) values
  ('TRD-FRAU',     'Lote Néstor Frau', 'trinidad',   'FRAU',        46,  'Néstor Edgardo Frau'),
  ('TRD-CASAFRAU', 'Casa Frau',        'trinidad',   'CASA FRAU',   50,  'Néstor Edgardo Frau'),
  ('TRD-PILOT',    'Pilot',            'trinidad',   'PILOT',       17,  'Jastrow'),
  ('TRD-TP1',      'Tala Poso 1',      'trinidad',   'TALA POSO 1', 60,  'Néstor Edgardo Frau'),
  ('TRD-TP2',      'Tala Poso 2',      'trinidad',   'TALA POSO 2', 30,  'Néstor Edgardo Frau'),
  ('TRD-TP3',      'Tala Poso 3',      'trinidad',   'TALA POSO 3', 30,  'Néstor Edgardo Frau'),
  ('CON-101',      'Lote 101',         'concepcion', 'LAS 101',     101, 'Jastrow'),
  ('CON-TANO',     'Tano',             'concepcion', 'TANO',        30,  'Jastrow'),
  ('CON-PACO',     'Paco',             'concepcion', 'PACO',        45,  'Jastrow'),
  ('CON-LUCHO',    'Lucho',            'concepcion', 'LUCHO',       140, 'Jastrow'),
  ('CON-PAQUITO',  'Paquito',          'concepcion', 'PAQUITO',     60,  'Jastrow')
on conflict (id) do nothing;
