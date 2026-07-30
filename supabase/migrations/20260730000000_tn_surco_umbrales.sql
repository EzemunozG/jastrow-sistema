-- Umbrales de tn/surco FINAL en app_settings, para calibrar sin deploy (decisión del
-- usuario, 2026-07-30). HOY el color de las tarjetas del Mapa de lotes va por Rdto%
-- vs meta (comparable aunque la cosecha esté en curso), NO por tn/surco — estas
-- columnas quedan provisionadas para cuando exista noción de "lote cerrado" y el color
-- pueda pasar a tn/surco definitivo. Los defaults son los valores de maqueta que se
-- venían usando; se recalibran editando la fila (o desde la UI de Costos más adelante).
--
-- La pantalla funciona sin esta migración: lib/lot-map.ts tiene TN_SURCO_UMBRAL_DEFAULT
-- como fallback. Aplicar cuando se quiera empezar a persistir/calibrar los umbrales.

alter table app_settings
  add column if not exists tn_surco_verde numeric not null default 5.5,
  add column if not exists tn_surco_amarillo numeric not null default 4.5;
