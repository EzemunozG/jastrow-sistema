-- Ventas de azúcar propia (2026-08-18). Cada fila es una operación de venta de la
-- azúcar que le queda a Jastrow después del reparto con el ingenio (ver lib/azucar.ts).
-- Alimenta el "Disponible" del apartado "Azúcar por ingenio": disponible = azúcar
-- propia − kg vendidos.
--
-- `ingenio_id` es text libre a propósito (sin FK a `ingenios`): la venta se atribuye al
-- ingenio del que salió la azúcar, y los datos se cargan por SQL después del deploy —
-- una FK haría fallar la carga entera por un id mal tipeado en vez de dejar la fila
-- visible para corregirla. Los ids válidos hoy son 'concepcion' y 'trinidad'.
--
-- kg y bolsas se guardan los DOS (no se deriva uno del otro con PESO_BOLSA): el
-- comprobante del comprador puede venir con un peso real que no sea exactamente
-- bolsas × 50 kg, y el descuento del disponible va por kg.
create table if not exists ventas_azucar (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  ingenio_id text not null,
  bolsas numeric not null,
  kg numeric not null,
  precio_unit_con_iva numeric,
  importe_neto numeric,
  iva numeric,
  importe_total numeric,
  comprobante text,
  comprador text,
  obs text,
  created_at timestamptz not null default now()
);

create index if not exists ventas_azucar_ingenio_fecha_idx
  on ventas_azucar (ingenio_id, fecha);

alter table ventas_azucar enable row level security;

-- Mismo patrón split-by-verb del resto de las tablas operativas (ver
-- 20260728000001_viewer_rls.sql): lectura para cualquier autenticado, escritura para
-- cualquier autenticado que no sea 'viewer'.
create policy "authenticated_read_ventas_azucar" on ventas_azucar
  for select using (auth.uid() is not null);
create policy "writer_insert_ventas_azucar" on ventas_azucar
  for insert with check (auth.uid() is not null and not is_viewer());
create policy "writer_update_ventas_azucar" on ventas_azucar
  for update using (auth.uid() is not null and not is_viewer())
  with check (auth.uid() is not null and not is_viewer());
create policy "writer_delete_ventas_azucar" on ventas_azucar
  for delete using (auth.uid() is not null and not is_viewer());
