-- Multi-ingenio: separar Ingenio Concepción (todos los datos existentes) de
-- Ingenio Trinidad (próximamente). Los datos históricos quedan como 'concepcion'
-- vía el default; Trinidad no aparece hasta que se importe un INFRARUT suyo.

create table ingenios (
  id text primary key,
  nombre text not null
);

insert into ingenios (id, nombre) values
  ('concepcion', 'Ingenio Concepción'),
  ('trinidad', 'Ingenio Trinidad');

-- Misma política que las otras tablas de lookup: lectura para autenticados.
-- No hay policy de escritura — el catálogo de ingenios se mantiene por migración.
alter table ingenios enable row level security;
create policy "authenticated_read_ingenios" on ingenios
  for select using (auth.uid() is not null);

alter table infraruts_imports
  add column if not exists ingenio_id text not null default 'concepcion' references ingenios (id);

alter table infraruts
  add column if not exists ingenio_id text not null default 'concepcion' references ingenios (id);

-- El CP es el correlativo interno de CADA ingenio (secuencias independientes por
-- ingenio), así que la unicidad global de cp haría que un import de Trinidad pise
-- filas de Concepción con el mismo número. La unicidad real es (ingenio_id, cp) —
-- el upsert de importInfraruts usa este constraint como onConflict.
alter table infraruts drop constraint infraruts_cp_key;
alter table infraruts add constraint infraruts_ingenio_id_cp_key unique (ingenio_id, cp);
