-- Vista de saldo de stock: la única lógica de negocio que resolvemos en SQL en vez
-- de TypeScript (ver lib/stock.ts y CLAUDE.md), porque se consulta desde varias
-- pantallas (inventario, costos, preview de receta) y es un simple group by.
-- Fórmulas porteadas de calcStock() en index_10.html:2875.
create view stock_saldo
  with (security_invoker = true)
as
select
  producto_id,
  coalesce(sum(case when tipo = 'entrada' then cantidad else 0 end), 0)
    - coalesce(sum(case when tipo = 'salida' then cantidad else 0 end), 0) as saldo,
  coalesce(
    sum(case when tipo = 'entrada' and precio_unit > 0 then cantidad * precio_unit end)
      / nullif(sum(case when tipo = 'entrada' and precio_unit > 0 then cantidad end), 0),
    0
  ) as precio_prom
from movimientos_stock
group by producto_id;

grant select on stock_saldo to authenticated;
