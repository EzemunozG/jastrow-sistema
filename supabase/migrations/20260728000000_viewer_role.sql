-- Rol 'viewer' (solo lectura) — decisión confirmada por el usuario, 2026-07-28: ve
-- todo el sistema (incluidos costos/arriendos), no puede editar nada. Se extiende
-- profiles.role en vez de introducir un mecanismo nuevo (ver nota abajo).
--
-- El usuario pidió específicamente `app_metadata.role = 'viewer'` en Supabase Auth.
-- Eso se setea igual (ver script de creación del usuario), pero NO es lo que controla
-- el acceso acá: is_admin() (rls.sql) y getCurrentProfile()/requireAdmin() (lib/dal.ts)
-- ya leen profiles.role directamente de la tabla, no del JWT — no hay ningún lugar del
-- código actual que mire app_metadata. Agregar 'viewer' a profiles.role reutiliza el
-- mismo mecanismo que admin/user ya usan (una sola fuente de verdad). Usar
-- app_metadata para el enforcement real requeriría un Auth Hook de Postgres
-- (custom_access_token_hook) para inyectarlo en el JWT y que las policies de RLS lo
-- puedan leer vía auth.jwt() — no está configurado y es un cambio aparte, más grande,
-- que no se hizo acá para no tener dos fuentes de verdad de rol que se puedan
-- desincronizar.

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'user', 'viewer'));
