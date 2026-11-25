-- Productos con error: se ocultan solos de la tienda y aparecen en "Alertas / pendientes".
-- Hoy la regla es: alguna caja de alguna variante del producto con stock físico negativo
-- (se despachó o se descontó más de lo que entró). Cuando se corrige el stock, el producto vuelve a la tienda solo.
create or replace function public.productos_bloqueados() returns table(id text, motivo text)
language sql stable security definer set search_path = public as $f$
  select v.codigo_master,
         'Stock negativo en ' || string_agg(s.sku_caja || ' (' || s.fisico || ')', ', ' order by s.sku_caja)
  from variantes v join stock_cajas() s on s.sku = v.sku
  where s.fisico < 0 and v.estado <> 'discontinuado'
  group by v.codigo_master $f$;
grant execute on function public.productos_bloqueados() to anon, authenticated;
select * from public.productos_bloqueados();
