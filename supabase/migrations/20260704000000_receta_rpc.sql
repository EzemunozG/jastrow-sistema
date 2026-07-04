-- Guardar una receta es una operación de todo-o-nada: la receta, sus ítems y el
-- movimiento de salida de stock por cada producto usado deben quedar consistentes juntos
-- (index_10.html:3087-3110, saveReceta). Hacerlo como una función plpgsql en vez de
-- varios .insert() sueltos desde el cliente garantiza que un fallo a mitad de camino
-- (ej. un producto que ya no existe) no deje una receta a medias sin su salida de stock.
create or replace function create_receta(
  p_id text,
  p_nombre text,
  p_fecha date,
  p_tipo text,
  p_ha numeric,
  p_empresa text,
  p_obs text,
  p_lote_ids text[],
  p_items jsonb -- array de {producto_id, dosis, unidad, cantidad, precio_unit}
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_costo_total numeric := 0;
  v_costo_ha numeric := 0;
  v_item jsonb;
begin
  select coalesce(sum((item->>'cantidad')::numeric * (item->>'precio_unit')::numeric), 0)
    into v_costo_total
    from jsonb_array_elements(p_items) as item;

  if p_ha > 0 then
    v_costo_ha := v_costo_total / p_ha;
  end if;

  insert into recetas (id, nombre, fecha, tipo, ha, empresa, obs, costo_total, costo_ha)
  values (p_id, p_nombre, p_fecha, p_tipo, p_ha, p_empresa, p_obs, v_costo_total, v_costo_ha);

  if array_length(p_lote_ids, 1) > 0 then
    insert into receta_lotes (receta_id, lote_id)
    select p_id, unnest(p_lote_ids);
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into receta_items (receta_id, producto_id, dosis, unidad, cantidad, precio_unit)
    values (
      p_id,
      nullif(v_item->>'producto_id', ''),
      (v_item->>'dosis')::numeric,
      v_item->>'unidad',
      (v_item->>'cantidad')::numeric,
      (v_item->>'precio_unit')::numeric
    );

    if nullif(v_item->>'producto_id', '') is not null and (v_item->>'cantidad')::numeric > 0 then
      insert into movimientos_stock (producto_id, tipo, fecha, cantidad, precio_unit, origen, obs, receta_id)
      values (
        v_item->>'producto_id',
        'salida',
        p_fecha,
        (v_item->>'cantidad')::numeric,
        (v_item->>'precio_unit')::numeric,
        'Receta ' || p_id,
        (v_item->>'dosis') || ' ' || (v_item->>'unidad') || '/ha · ' || p_ha || ' ha',
        p_id
      );
    end if;
  end loop;

  return p_id;
end;
$$;

grant execute on function create_receta(text, text, date, text, numeric, text, text, text[], jsonb)
  to authenticated;
