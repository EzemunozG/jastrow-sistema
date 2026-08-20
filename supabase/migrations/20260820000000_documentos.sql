-- Repositorio de documentos del campo (2026-08-20): informes agronómicos,
-- liquidaciones de maquila, facturas, análisis de suelo, contratos y órdenes de
-- maquila. Es un índice de ARCHIVOS con metadatos — no reemplaza a las tablas que ya
-- modelan esos datos (`facturas`, `analisis_suelo`): acá vive el PDF/planilla tal como
-- lo mandó el ingenio o el asesor, para poder abrir el original cuando el número no
-- cierra.
--
-- `archivo_path` es la key dentro del bucket privado `documentos` (ver
-- 20260820000001_documentos_storage.sql). Es nullable a propósito: una fila puede
-- registrar que un documento existe (con su resumen) antes de que alguien consiga el
-- archivo — la pantalla muestra la fila sin botón de descarga en vez de esconderla.
--
-- `lote_key` e `ingenio_id` son text libre sin FK, igual que en `analisis_suelo` y
-- `ventas_azucar`: son enlaces cruzados livianos para filtrar y mostrar un chip, y un
-- id que no matchee tiene que dejar el documento visible, no volteárlo.
create table if not exists documentos (
  id uuid primary key default gen_random_uuid(),
  fecha date,
  tipo text not null default 'otro',
  titulo text not null,
  autor text,
  resumen text,
  archivo_path text,
  lote_key text,
  ingenio_id text,
  obs text,
  created_at timestamptz not null default now(),
  -- Los tipos son cerrados porque la UI pinta un chip por cada uno; 'otro' es la
  -- válvula de escape para no tener que migrar por un caso suelto. Si aparece una
  -- familia nueva de documentos, se agrega acá y en DOCUMENTO_TIPOS
  -- (lib/forms/documentos.ts) — los dos lugares, o el chip queda sin color.
  constraint documentos_tipo_check check (
    tipo in (
      'informe_agronomico', 'liquidacion', 'factura', 'analisis_suelo',
      'contrato', 'orden_maquila', 'otro'
    )
  )
);

create index if not exists documentos_fecha_idx on documentos (fecha desc);
create index if not exists documentos_tipo_idx on documentos (tipo);
create index if not exists documentos_lote_idx on documentos (lote_key);

alter table documentos enable row level security;

-- Patrón split-by-verb del resto de las tablas operativas (ver
-- 20260728000001_viewer_rls.sql): lectura para cualquier autenticado, escritura para
-- cualquier autenticado que no sea 'viewer'.
create policy "authenticated_read_documentos" on documentos
  for select using (auth.uid() is not null);
create policy "writer_insert_documentos" on documentos
  for insert with check (auth.uid() is not null and not is_viewer());
create policy "writer_update_documentos" on documentos
  for update using (auth.uid() is not null and not is_viewer())
  with check (auth.uid() is not null and not is_viewer());
create policy "writer_delete_documentos" on documentos
  for delete using (auth.uid() is not null and not is_viewer());
