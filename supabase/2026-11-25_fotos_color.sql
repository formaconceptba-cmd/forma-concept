-- Fotos por color: cada variante (SKU de venta) tiene su galería. La tienda muestra la del color elegido.
alter table public.variantes add column if not exists fotos jsonb not null default '[]'::jsonb;
drop function if exists public.variantes_publicas();
create function public.variantes_publicas() returns table(sku text, producto text, color text, nombre text, hex text, disponible int, con_datos boolean, orden int, fotos jsonb)
language sql stable security definer set search_path = public as $f$
  select v.sku, v.codigo_master, v.color, c.nombre, c.hex, greatest(0, s.disponible), coalesce(s.con_datos, false), v.orden, v.fotos
  from variantes v join colores c on c.codigo = v.color left join stock_variantes() s on s.sku = v.sku
  where v.estado <> 'discontinuado' and c.activo and public.variante_en_pedido(v.sku) order by v.codigo_master, v.orden, v.sku $f$;
grant execute on function public.variantes_publicas() to anon, authenticated;

-- Catálogo mayorista (pro_catalogo): se compra por lotes de UNIDADES, así que el precio de la tienda (que es por caja/pack) se divide por piezas_por_caja.
do $x$ declare d text; begin
  d := pg_get_functiondef('public.pro_catalogo'::regproc);
  if position('piezas_por_caja' in d) = 0 then
    d := replace(d, 'coalesce(pc.publico::numeric,', 'coalesce(pc.publico::numeric / greatest(coalesce(m.piezas_por_caja,1),1),');
    if position('piezas_por_caja' in d) = 0 then raise exception 'no se pudo reemplazar'; end if;
    execute d;
  end if;
  if not exists (select 1 from settings where key = 'packs_pro_revert') then
    update catalogo_pro c set precio_lista = round(c.precio_lista / m.piezas_por_caja / 1000.0) * 1000 from master_productos m where m.codigo = c.codigo and m.piezas_por_caja > 1 and c.precio_lista is not null;
    insert into settings(key, value) values ('packs_pro_revert', 1);
  end if;
end $x$;

-- Publicar / sacar de la tienda cada color por separado
alter table public.variantes add column if not exists publicado boolean not null default true;
create or replace function public.variantes_publicas() returns table(sku text, producto text, color text, nombre text, hex text, disponible int, con_datos boolean, orden int, fotos jsonb)
language sql stable security definer set search_path = public as $f$
  select v.sku, v.codigo_master, v.color, c.nombre, c.hex, greatest(0, s.disponible), coalesce(s.con_datos, false), v.orden, v.fotos
  from variantes v join colores c on c.codigo = v.color left join stock_variantes() s on s.sku = v.sku
  where v.estado <> 'discontinuado' and v.publicado and c.activo and public.variante_en_pedido(v.sku) order by v.codigo_master, v.orden, v.sku $f$;
