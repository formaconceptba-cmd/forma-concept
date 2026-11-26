-- Productos con error: se ocultan solos de la tienda (y del checkout) y aparecen en "Alertas / pendientes".
-- 1) Stock negativo en un color publicado (un color quitado/oculto ya no frena al producto).
-- 2) Precio de lista abajo del mínimo sin perder (lo calcula el panel con todos los costos y lo guarda en products.precio_minimo)
--    o menor a $10.000 (seguro contra un error de tipeo, ej. $100). Cuando se corrige, vuelve solo.
alter table public.products add column if not exists precio_minimo numeric;
create or replace function public.productos_bloqueados() returns table(id text, motivo text)
language sql stable security definer set search_path = public as $f$
  select v.codigo_master,
         'Stock negativo en ' || string_agg(s.sku_caja || ' (' || s.fisico || ')', ', ' order by s.sku_caja)
  from variantes v join stock_cajas() s on s.sku = v.sku
  where s.fisico < 0 and v.estado <> 'discontinuado' and v.publicado is not false
  group by v.codigo_master
  union all
  select p.id,
         case when p.precio_lista < 10000 then 'Precio de lista de $' || round(p.precio_lista) || ': parece un error'
              else 'Precio de lista $' || to_char(round(p.precio_lista), 'FM999G999G999') || ' abajo del mínimo sin perder $' || to_char(round(p.precio_minimo), 'FM999G999G999') end
  from products p
  where p.activo and p.precio_lista is not null
    and (p.precio_lista < 10000 or (p.precio_minimo is not null and p.precio_lista < p.precio_minimo)) $f$;
grant execute on function public.productos_bloqueados() to anon, authenticated;
select * from public.productos_bloqueados();
