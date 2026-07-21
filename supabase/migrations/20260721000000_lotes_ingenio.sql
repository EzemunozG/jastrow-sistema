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

-- Trinidad: los 5 lotes de Néstor Edgardo Frau (hectáreas dadas por el usuario,
-- 2026-07-21). Falta 'PILOT' (lote_key con datos reales en cps_campo — 23 despachos
-- reconciliados a la fecha) porque no se recibió su hectareaje; agregar en una
-- migración de seguimiento cuando esté confirmado.
insert into lotes_ingenio (id, nombre, ingenio_id, lote_key, ha, propietario) values
  ('TRD-FRAU',     'Lote Néstor Frau', 'trinidad', 'FRAU',        46, 'Néstor Edgardo Frau'),
  ('TRD-CASAFRAU', 'Lote Casa Frau',   'trinidad', 'CASA FRAU',   50, 'Néstor Edgardo Frau'),
  ('TRD-TP1',      'Tala Poso 1',      'trinidad', 'TALA POSO 1', 60, 'Néstor Edgardo Frau'),
  ('TRD-TP2',      'Tala Poso 2',      'trinidad', 'TALA POSO 2', 30, 'Néstor Edgardo Frau'),
  ('TRD-TP3',      'Tala Poso 3',      'trinidad', 'TALA POSO 3', 30, 'Néstor Edgardo Frau')
on conflict (id) do nothing;

-- Concepción: 'LAS 101' es el catch-all de cps_campo.lote para todos los despachos de
-- finca_id='LOTE4' (ver 20260716000000_cps_campo_lote.sql) — equivale a la finca LOTE4
-- completa, no a una parcela suelta. Hectareaje ESTIMADO por suma de las 5 parcelas
-- físicas de esa finca en la tabla `lotes` (L4-100 71 + L4-LUCHO 50 + L4-PILOT 0,
-- "pendiente de confirmar" + L4-TP2 39.8 + L4-TP3 95.8 = 256.6 ha) — confirmar antes de
-- confiar en el tn/ha que se muestre para este lote. 'TANO' y 'PACO' (sub-lotes de la
-- finca VIRGINIA, con datos reales: 59 y 12 despachos respectivamente) y 'LOTE 3'
-- (definido en el backfill pero sin despachos aún) quedan afuera: no hay forma de
-- derivar cuánto de los 433.5 ha totales de VIRGINIA corresponde a cada uno sin que el
-- usuario lo confirme.
insert into lotes_ingenio (id, nombre, ingenio_id, lote_key, ha, propietario, obs) values
  ('CNC-LAS101', 'Las 101', 'concepcion', 'LAS 101', 256.6, 'JASTROW INVER GROUP S.A.',
   'Ha estimada = suma de lotes L4-100+L4-LUCHO+L4-PILOT+L4-TP2+L4-TP3 en la tabla lotes — confirmar')
on conflict (id) do nothing;
