-- Habilita Supabase Realtime (postgres_changes) para las tablas que usa
-- hooks/useRealtimeTable.ts en Viajes/Listado, Reconciliación y Alertas.
-- Idempotente: solo agrega la tabla a la publicación si todavía no está.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'infraruts'
  ) then
    alter publication supabase_realtime add table infraruts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cps_campo'
  ) then
    alter publication supabase_realtime add table cps_campo;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bajas_arca'
  ) then
    alter publication supabase_realtime add table bajas_arca;
  end if;
end $$;
