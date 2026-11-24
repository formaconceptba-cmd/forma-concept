-- Colores: la paleta FORMA es la fuente de verdad. Equivalencias de los nombres viejos de la tienda y regla "solo se publica un color que está en un pedido".
create table if not exists public.colores_alias (
  nombre text primary key, codigo text references public.colores(codigo), nota text, confirmado boolean not null default false);
alter table public.colores_alias enable row level security;
drop policy if exists colores_alias_admin on public.colores_alias;
create policy colores_alias_admin on public.colores_alias for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- sugerencias por cercanía de tono (confirmado = false: se revisan en Colores FORMA)
insert into public.colores_alias(nombre,codigo,nota) values
 ('Natural','NAT',null),('Negro','NEG',null),('Arena','ARE',null),('Café','CAF',null),('Bordó','BOR',null),('Oliva','VER','Verde oliva'),
 ('Terracota','LAD','tono ladrillo'),('Rojo ladrillo','BOR','#7E2F35 es más bordó que ladrillo'),('Grafito','NEG','gris muy oscuro: ¿negro o gris?'),
 ('Gris piedra','GRI',null),('Piedra','BEI','¿beige o gris?'),('Hueso','BEI','¿beige o blanco?'),('Marfil','BLA','¿blanco o beige?'),
 ('Salvia','VER','verde claro: no hay equivalente exacto'),('Tabaco','CAF','¿café o marrón claro?'),('Natural ahumado','MAR','¿natural o marrón claro?'),('A definir',null,'no se puede publicar')
on conflict (nombre) do nothing;

-- variante "en pedido": alguna de sus cajas está en un contenedor (cualquier estado) o hay stock físico
create or replace function public.variante_en_pedido(p_sku text) returns boolean language sql stable security definer set search_path = public as $f$
  select exists (select 1 from cajas c join eco_ingreso i on i.sku_caja = c.sku_caja
                 where c.sku = p_sku and i.cajas > 0)
      or exists (select 1 from cajas c join stock_mov m on m.sku_caja = c.sku_caja where c.sku = p_sku group by c.sku_caja having sum(m.piezas) > 0) $f$;
grant execute on function public.variante_en_pedido(text) to authenticated;

-- la tienda sólo ofrece colores que están en un pedido
create or replace function public.variantes_publicas() returns table(sku text, producto text, color text, nombre text, hex text, disponible int, con_datos boolean, orden int)
language sql stable security definer set search_path = public as $f$
  select v.sku, v.codigo_master, v.color, c.nombre, c.hex, greatest(0, s.disponible), coalesce(s.con_datos, false), v.orden
  from variantes v join colores c on c.codigo = v.color left join stock_variantes() s on s.sku = v.sku
  where v.estado <> 'discontinuado' and c.activo and public.variante_en_pedido(v.sku) order by v.codigo_master, v.orden, v.sku $f$;
grant execute on function public.variantes_publicas() to anon, authenticated;
