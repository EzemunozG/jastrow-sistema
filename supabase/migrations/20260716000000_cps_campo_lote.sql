-- Lote de origen de cada despacho de la libreta, para el desglose de
-- reconciliación por lote. Nullable: los despachos que ninguna regla de
-- backfill alcanza quedan sin lote (la UI los agrupa como "Sin lote").

alter table cps_campo add column if not exists lote text;

-- Backfill de los registros existentes. Trinidad se asigna por rango de remito
-- (recordar: cps_campo.cp guarda NÚMEROS DE REMITO); Concepción por contenido
-- de obs y por finca. El orden importa: las reglas por obs (más específicas)
-- corren antes que las reglas por finca, que solo toman lo que quedó sin lote.

update cps_campo set lote = 'FRAU'
  where ingenio_id = 'trinidad' and cp between 7101 and 7175;

update cps_campo set lote = 'PILOT'
  where ingenio_id = 'trinidad' and cp between 7176 and 7198;

update cps_campo set lote = 'CASA FRAU'
  where ingenio_id = 'trinidad' and cp = 7199;

update cps_campo set lote = 'TANO'
  where ingenio_id = 'concepcion' and obs ilike '%TANO%';

update cps_campo set lote = 'PACO'
  where ingenio_id = 'concepcion' and obs ilike '%PACO%' and lote is null;

update cps_campo set lote = 'LOTE 3'
  where ingenio_id = 'concepcion' and lote is null
    and (obs ilike '%LOTE 3%' or finca_id = 'VIRGINIA');

update cps_campo set lote = 'LAS 101'
  where ingenio_id = 'concepcion' and finca_id = 'LOTE4' and lote is null;
