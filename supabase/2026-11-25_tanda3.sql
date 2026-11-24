-- TANDA 3: packs (se vende la caja completa), checkout (DNI, retiro, envío por volumen), mails editables,
-- cola de facturas B / notas de crédito, devoluciones, roturas por caja.

-- ---------- capacidad real del 40HQ (la que usa Compras) ----------
update public.settings set value = '68' where key = 'cap_cbm';

-- ---------- packs: el stock de la tienda se cuenta en unidades de venta (cajas completas) ----------
create or replace function public.stock_calc() returns table(id text, fuente text, fisico integer, en_camino integer, vendido integer, reservado integer, total integer, disponible integer, contenedores jsonb)
language sql stable security definer set search_path to 'public' as $function$
with h as (select coalesce((select horas from cobro_transf where id = 1),48) hs),
pz as (select codigo, greatest(coalesce(piezas_por_caja,1),1) p from master_productos),
cam as (select i.codigo, (sum(i.cant) / coalesce(max(pz.p),1))::int u from eco_items i join eco_pedidos p on p.id = i.pedido_id left join pz on pz.codigo = i.codigo where p.estado in ('confirmado','en_transito') group by 1),
fis as (select r.codigo, (sum(r.recibidas - r.rotas) / coalesce(max(pz.p),1))::int u from eco_recepcion r join eco_pedidos p on p.id = r.pedido_id left join pz on pz.codigo = r.codigo where p.estado in ('recibido','cerrado') group by 1),
res_o as (select oi.product_id codigo, sum(oi.cantidad)::int u from order_items oi join orders o on o.id = oi.order_id cross join h where o.estado = 'pendiente' and o.created_at > now() - make_interval(hours => h.hs) group by 1),
res_p as (select coalesce(x->>'id',x->>'codigo') codigo, sum((x->>'q')::int)::int u from pedidos_pro pp cross join jsonb_array_elements(coalesce(pp.items,'[]'::jsonb)) x where pp.estado <> 'cancelado' group by 1),
cont as (select i.codigo, jsonb_agg(jsonb_build_object('pedido',p.nombre,'estado',p.estado,'cant',i.cant) order by p.created_at) c from eco_items i join eco_pedidos p on p.id = i.pedido_id group by 1),
b as (select p.id, p.linea, coalesce(p.unidades,0) manual, coalesce(p.vendidas,0) vend, coalesce(cam.u,0) ec, coalesce(fis.u,0) fi, coalesce(res_o.u,0) + coalesce(res_p.u,0) rs, cont.c
      from products p left join cam on cam.codigo = p.id left join fis on fis.codigo = p.id left join res_o on res_o.codigo = p.id left join res_p on res_p.codigo = p.id left join cont on cont.codigo = p.id)
select id, case when linea = 'Nacional' then 'manual' when fi > 0 or ec > 0 then 'contenedor' else 'manual' end, fi, ec, vend, rs,
  case when linea <> 'Nacional' and (fi > 0 or ec > 0) then fi + ec else manual end,
  (case when linea <> 'Nacional' and (fi > 0 or ec > 0) then fi + ec else manual end) - vend - rs, c from b $function$;

create or replace function public.stock_variantes() returns table(sku text, disponible int, con_datos boolean, cajas int)
language sql stable security definer set search_path = public as $f$
  with s as (select * from stock_cajas()),
  h as (select coalesce((select horas from cobro_transf where id = 1), 48) hs),
  res as (select oi.sku, sum(oi.cantidad)::int u from order_items oi join orders o on o.id = oi.order_id cross join h
          where o.estado = 'pendiente' and o.created_at > now() - make_interval(hours => h.hs) and oi.sku is not null group by 1)
  select v.sku, (case when count(s.sku_caja) = 0 then 0 else min(s.total / greatest(s.piezas_caja,1)) end - coalesce(max(res.u), 0))::int,
    coalesce(bool_or(s.fisico <> 0 or s.en_camino <> 0), false), count(s.sku_caja)::int
  from variantes v left join s on s.sku = v.sku left join res on res.sku = v.sku group by v.sku $f$;
revoke execute on function public.stock_variantes() from public, anon, authenticated;

-- 1 unidad vendida = 1 caja completa (o el kit tapa + base): a Pailos van las piezas de esa caja
create or replace function public.despacho_lineas(p_sku text, p_cant int) returns table(sku text, sku_caja text, parte text, piezas int, descripcion text)
language sql stable security definer set search_path = public as $f$
  select v.sku, c.sku_caja, c.parte, p_cant * c.piezas, v.descripcion from variantes v join cajas c on c.sku = v.sku where v.sku = p_sku order by c.orden, c.sku_caja $f$;

-- ficha pública: armado, bultos y pack (sale del Maestro)
create or replace function public.ficha_publica() returns table(id text, peso_kg numeric, armado text, piezas_por_caja int, cajas_por_unidad int, medidas text)
language sql stable security definer set search_path = public as $f$
  select p.id, m.peso_kg, m.armado, coalesce(m.piezas_por_caja,1), coalesce(m.cajas_por_unidad,1), m.medidas
  from products p join master_productos m on m.codigo = p.id where p.activo $f$;
grant execute on function public.ficha_publica() to anon, authenticated;

-- precios de la tienda pasan a ser por pack (una sola vez)
do $$ begin
  if not exists (select 1 from settings where key = 'packs_migrado') then
    update products p set precio_lista = round(p.precio_lista * m.piezas_por_caja / 1000.0) * 1000,
      precio_preventa = case when p.precio_preventa is not null then round(p.precio_preventa * m.piezas_por_caja / 1000.0) * 1000 end
    from master_productos m where m.codigo = p.id and m.piezas_por_caja > 1 and p.precio_lista is not null;
    update catalogo_pro c set precio_lista = round(c.precio_lista * m.piezas_por_caja / 1000.0) * 1000
    from master_productos m where m.codigo = c.codigo and m.piezas_por_caja > 1 and c.precio_lista is not null;
    insert into settings(key, value) values ('packs_migrado', '1');
  end if;
end $$;

-- cupos manuales también pasan a unidades de venta (una sola vez)
do $$ begin
  if not exists (select 1 from settings where key = 'packs_cupo_migrado') then
    update products p set unidades = p.unidades / m.piezas_por_caja from master_productos m where m.codigo = p.id and m.piezas_por_caja > 1 and p.unidades is not null;
    insert into settings(key, value) values ('packs_cupo_migrado', '1');
  end if;
end $$;

-- ---------- checkout ----------
alter table public.orders add column if not exists dni text, add column if not exists tracking_envio text,
  add column if not exists despachado_at timestamptz, add column if not exists cancelado_at timestamptz, add column if not exists bultos int;
insert into public.settings(key, value) values ('envio_m3_activo', 0) on conflict (key) do nothing;
-- textos de la tienda (settings es numérico)
create table if not exists public.config_tienda (key text primary key, value text);
alter table public.config_tienda enable row level security;
drop policy if exists config_tienda_leer on public.config_tienda;
create policy config_tienda_leer on public.config_tienda for select using (true);
drop policy if exists config_tienda_admin on public.config_tienda;
create policy config_tienda_admin on public.config_tienda for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.config_tienda(key, value) values ('retiro_dir', ''), ('retiro_horario', ''), ('retiro_nota', 'Coordiná el día y horario por WhatsApp antes de ir.') on conflict (key) do nothing;
create table if not exists public.envio_tarifas (
  zona text primary key, nombre text not null, desde_cp int not null, hasta_cp int not null,
  precio_m3 numeric, minimo numeric, activo boolean not null default true, orden int default 0);
alter table public.envio_tarifas enable row level security;
drop policy if exists envio_tarifas_leer on public.envio_tarifas;
create policy envio_tarifas_leer on public.envio_tarifas for select using (true);
drop policy if exists envio_tarifas_admin on public.envio_tarifas;
create policy envio_tarifas_admin on public.envio_tarifas for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- mails editables ----------
create table if not exists public.mail_plantillas (
  clave text primary key, nombre text not null, asunto text not null, cuerpo text not null, activo boolean not null default true, orden int default 0, updated_at timestamptz default now());
alter table public.mail_plantillas enable row level security;
drop policy if exists mail_plantillas_admin on public.mail_plantillas;
create policy mail_plantillas_admin on public.mail_plantillas for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.mail_plantillas(clave, nombre, asunto, cuerpo, orden) values
('recibido_transf','Pedido recibido (transferencia)','Tu pedido #{pedido} · datos para transferir',
 E'¡Gracias, {nombre}! Reservamos tu pedido.\n\nTenés {horas} horas para transferir {total}. Pasado ese plazo el pedido se cancela solo y los productos se liberan.\n\n{datos_transferencia}\n\n{detalle}\n\nCuando recibamos la transferencia te avisamos por mail.',1),
('pagado','Pago acreditado','Recibimos tu compra · Pedido #{pedido}',
 E'¡Gracias, {nombre}! Tu pedido #{pedido} está confirmado.\n\n{detalle}\n\nTe vamos a escribir para coordinar la entrega.',2),
('en_camino','Pedido despachado','Tu pedido #{pedido} está en camino',
 E'{nombre}, tu pedido #{pedido} salió.\n\n{seguimiento}\n\nCualquier cosa, respondé este mail o escribinos por WhatsApp.',3),
('entregado','Pedido entregado','¡Que lo disfrutes! · Pedido #{pedido}',
 E'{nombre}, tu pedido #{pedido} figura como entregado. Gracias por elegir FORMA Concept.\n\nSi algo no llegó bien, respondé este mail y lo resolvemos.',4),
('vencido','Pago vencido / pedido cancelado','Tu pedido #{pedido} se canceló',
 E'{nombre}, no recibimos la transferencia de tu pedido #{pedido} dentro de las {horas} horas, así que lo cancelamos y liberamos los productos.\n\nSi igual lo querés, hacé el pedido de nuevo en la web o escribinos.',5)
on conflict (clave) do nothing;

-- ---------- facturas B y notas de crédito (cola; el envío a ARCA se conecta cuando esté el certificado) ----------
create table if not exists public.facturas (
  id bigserial primary key, order_id bigint not null references public.orders(id), tipo text not null default 'B' check (tipo in ('B','NC-B')),
  estado text not null default 'pendiente' check (estado in ('pendiente','emitida','error','manual','anulada')),
  total numeric not null, pto_vta int, numero bigint, cae text, cae_vto date, error text, intentos int not null default 0,
  proximo_intento timestamptz default now(), pdf_url text, factura_ref bigint references public.facturas(id),
  created_at timestamptz default now(), emitida_at timestamptz, unique (order_id, tipo));
alter table public.facturas enable row level security;
drop policy if exists facturas_admin on public.facturas;
create policy facturas_admin on public.facturas for all to authenticated using (public.is_admin()) with check (public.is_admin());
create or replace function public.facturas_cola() returns trigger language plpgsql security definer set search_path = public as $f$
begin
  if new.estado = 'pagado' and old.estado is distinct from 'pagado' then
    insert into facturas(order_id, tipo, total) values (new.id, 'B', new.total) on conflict (order_id, tipo) do nothing;
  end if;
  if new.estado = 'cancelado' and old.estado is distinct from 'cancelado' then
    new.cancelado_at := now();
    insert into facturas(order_id, tipo, total, factura_ref)
      select new.id, 'NC-B', f.total, f.id from facturas f where f.order_id = new.id and f.tipo = 'B' and f.estado in ('emitida','manual')
      on conflict (order_id, tipo) do nothing;
    -- si la factura todavía no salió, no hace falta nota de crédito: se anula en la cola
    update facturas set estado = 'anulada' where order_id = new.id and tipo = 'B' and estado in ('pendiente','error');
  end if;
  if new.estado = 'en_camino' and old.estado is distinct from 'en_camino' then new.despachado_at := coalesce(new.despachado_at, now()); end if;
  return new;
end $f$;
drop trigger if exists facturas_cola on public.orders;
create trigger facturas_cola before update of estado on public.orders for each row execute function public.facturas_cola();

-- ---------- devoluciones (la transferencia la hace Franco a mano; acá se registra) ----------
create table if not exists public.devoluciones (
  id bigserial primary key, order_id bigint not null references public.orders(id), motivo text not null, monto numeric not null,
  transferida_at date, referencia text, nota text, quien text default auth.email(), created_at timestamptz default now());
alter table public.devoluciones enable row level security;
drop policy if exists devoluciones_admin on public.devoluciones;
create policy devoluciones_admin on public.devoluciones for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- roturas por caja en la recepción ----------
alter table public.stock_mov drop constraint if exists stock_mov_motivo_check;
alter table public.stock_mov add constraint stock_mov_motivo_check check (motivo in ('ingreso','venta','ajuste','importacion','devolucion','anulacion','rotura'));
