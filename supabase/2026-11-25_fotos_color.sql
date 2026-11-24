-- Fotos por color: cada variante (SKU de venta) tiene su galería. La tienda muestra la del color elegido.
alter table public.variantes add column if not exists fotos jsonb not null default '[]'::jsonb;
drop function if exists public.variantes_publicas();
create function public.variantes_publicas() returns table(sku text, producto text, color text, nombre text, hex text, disponible int, con_datos boolean, orden int, fotos jsonb)
language sql stable security definer set search_path = public as $f$
  select v.sku, v.codigo_master, v.color, c.nombre, c.hex, greatest(0, s.disponible), coalesce(s.con_datos, false), v.orden, v.fotos
  from variantes v join colores c on c.codigo = v.color left join stock_variantes() s on s.sku = v.sku
  where v.estado <> 'discontinuado' and c.activo and public.variante_en_pedido(v.sku) order by v.codigo_master, v.orden, v.sku $f$;
grant execute on function public.variantes_publicas() to anon, authenticated;
