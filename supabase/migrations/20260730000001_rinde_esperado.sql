-- Rinde esperado (tn/ha) para la barra de avance de cosecha del Mapa de lotes
-- (v1.1, 2026-07-30). Avance = tn cosechadas / (ha × rinde_esperado), cap 100%.
--
-- Default global en app_settings (70 tn/ha), y override opcional por lote en
-- lotes_ingenio (null = usa el default global). La pantalla ya funciona sin esta
-- migración con el fallback 70 en código (lib/lot-map.ts:RINDE_ESPERADO_DEFAULT);
-- aplicar para poder calibrar el default o poner rindes por lote.

alter table app_settings
  add column if not exists rinde_esperado_tn_ha numeric not null default 70;

alter table lotes_ingenio
  add column if not exists rinde_esperado_tn_ha numeric; -- null = usa el default de app_settings
