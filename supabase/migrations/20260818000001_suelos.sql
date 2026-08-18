-- Análisis de suelo y plan de fertilización por lote (2026-08-18).
--
-- `lote_key` es la MISMA clave que usan `lotes_ingenio.lote_key` y `cps_campo.lote`
-- (texto libre: 'PACO', 'LAS 101', 'TALA POSO 2'…), no el id de la tabla `lotes` de
-- Campo — así el análisis y el plan quedan del lado del lote de cosecha, que es el que
-- tiene ha y surcos/ha para calcular dosis totales. Sin FK por el mismo motivo que
-- ventas_azucar: los datos se cargan por SQL y un lote puede analizarse antes de estar
-- declarado en lotes_ingenio.
--
-- `sector` es el sub-lote que informa el laboratorio cuando muestrea por partes
-- ('100-1', '100-2'…); null = el análisis cubre el lote entero.
create table if not exists analisis_suelo (
  id uuid primary key default gen_random_uuid(),
  fecha date,
  lote_key text,
  sector text,
  laboratorio text,
  informe_nro text,
  profundidad text,
  ph numeric,
  mo_pct numeric,
  n_total_pct numeric,
  p_ppm numeric,
  cic numeric,
  ca_me numeric,
  mg_me numeric,
  k_me numeric,
  -- text y no numeric a propósito: los informes traen valores del tipo "< 0,1" para el
  -- sodio, que no entran en una columna numérica sin perder la información del "<".
  na_me text,
  salinidad_ces numeric,
  textura text,
  obs text,
  created_at timestamptz not null default now()
);

create index if not exists analisis_suelo_lote_idx on analisis_suelo (lote_key, fecha);

-- Plan de fertilización: lo que se planificó aplicar por lote en una campaña.
--
-- `total_kg` viene calculado en el dato (dosis_kg_surco × surcos totales del lote), NO
-- se recalcula en el front — la pantalla de Suelos muestra al lado la cuenta con los
-- surcos de lotes_ingenio y avisa si difiere más de 5% (ver lib/suelo.ts), que es como
-- va a saltar solo cuando se carguen los surcos reales de cada lote.
create table if not exists plan_fertilizacion (
  id uuid primary key default gen_random_uuid(),
  campania text,
  lote_key text,
  producto text,
  dosis_kg_surco numeric,
  total_kg numeric,
  ventana text,
  estado text not null default 'planificado',
  obs text,
  created_at timestamptz not null default now()
);

create index if not exists plan_fertilizacion_lote_idx
  on plan_fertilizacion (lote_key, campania);

alter table analisis_suelo enable row level security;
alter table plan_fertilizacion enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['analisis_suelo', 'plan_fertilizacion']
  loop
    execute format(
      'create policy "authenticated_read_%1$s" on %1$s
       for select using (auth.uid() is not null)', t);
    execute format(
      'create policy "writer_insert_%1$s" on %1$s
       for insert with check (auth.uid() is not null and not is_viewer())', t);
    execute format(
      'create policy "writer_update_%1$s" on %1$s
       for update using (auth.uid() is not null and not is_viewer())
       with check (auth.uid() is not null and not is_viewer())', t);
    execute format(
      'create policy "writer_delete_%1$s" on %1$s
       for delete using (auth.uid() is not null and not is_viewer())', t);
  end loop;
end $$;
