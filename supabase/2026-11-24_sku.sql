-- SKU de venta, paleta de colores FORMA, cajas, stock por caja, ingreso de contenedor y despachos a Pailos.
-- Sólo agrega tablas y una columna. No cambia ni borra nada existente. Para deshacer: 2026-11-24_sku_down.sql

-- ---------- paleta ----------
create table if not exists public.colores (
  codigo text primary key check (codigo ~ '^[A-Z]{3}$'),
  nombre text not null, hex text check (hex is null or hex ~ '^#[0-9A-Fa-f]{6}$'),
  activo boolean not null default true, notas text, created_at timestamptz default now());
create or replace function public.colores_guardia() returns trigger language plpgsql as $f$
begin
  if tg_op='DELETE' then raise exception 'Los colores no se borran: se desactivan (así el código nunca se reusa para otro tono)'; end if;
  if new.codigo <> old.codigo then raise exception 'El código de un color no se puede cambiar'; end if;
  return new;
end $f$;
drop trigger if exists trg_colores_guardia on public.colores;
create trigger trg_colores_guardia before update or delete on public.colores for each row execute function public.colores_guardia();

create table if not exists public.colores_proveedor (
  id bigserial primary key, color text not null references public.colores(codigo), proveedor text not null, referencia text not null,
  unique (color, proveedor, referencia));

-- ---------- variantes (SKU de venta) ----------
create table if not exists public.variantes (
  sku text primary key, codigo_master text not null references public.master_productos(codigo),
  color text not null references public.colores(codigo), ref_proveedor text, descripcion text,
  estado text not null default 'borrador' check (estado in ('borrador','confirmado','impreso','discontinuado')),
  orden int default 0, created_at timestamptz default now(), confirmado_at timestamptz,
  unique (codigo_master, color));
-- SKU = CATEGORÍA (3 primeras letras del Master) - NÚMERO del Master - COLOR. Lo arma la base, no se escribe a mano.
create or replace function public.sku_de(p_codigo text, p_color text) returns text language sql immutable as $f$
  select substring(p_codigo from '^([A-Z]{3})') || '-' || substring(p_codigo from '-([0-9]{3,})-') || '-' || p_color $f$;
create or replace function public.variantes_guardia() returns trigger language plpgsql as $f$
begin
  if tg_op='DELETE' then
    if old.estado <> 'borrador' then raise exception 'Un SKU confirmado no se borra: se discontinúa (y nunca se recicla)'; end if;
    return old;
  end if;
  if tg_op='INSERT' then
    new.sku := public.sku_de(new.codigo_master, new.color);
    if new.sku is null then raise exception 'El código Master % no tiene el formato PREFIJO-###-PROV', new.codigo_master; end if;
    if new.estado <> 'borrador' then new.confirmado_at := now(); end if;
    return new;
  end if;
  if old.estado = 'discontinuado' and new.estado <> 'discontinuado' then raise exception 'Un SKU discontinuado no vuelve: queda muerto'; end if;
  if old.estado <> 'borrador' then
    if new.estado = 'borrador' then raise exception 'Un SKU confirmado no vuelve a borrador'; end if;
    if new.codigo_master <> old.codigo_master or new.color <> old.color or new.sku <> old.sku then raise exception 'El SKU % está bloqueado: no se puede cambiar producto ni color', old.sku; end if;
  else
    new.sku := public.sku_de(new.codigo_master, new.color);
    if new.estado <> 'borrador' then new.confirmado_at := now(); end if;
  end if;
  return new;
end $f$;
drop trigger if exists trg_variantes_guardia on public.variantes;
create trigger trg_variantes_guardia before insert or update or delete on public.variantes for each row execute function public.variantes_guardia();

-- ---------- cajas (SKU de caja) ----------
create table if not exists public.cajas (
  sku_caja text primary key, sku text not null references public.variantes(sku) on update cascade on delete cascade,
  parte text not null default 'COMPLETA', piezas int not null default 1 check (piezas > 0),
  largo_cm numeric, ancho_cm numeric, alto_cm numeric, peso_bruto numeric, peso_neto numeric,
  cbm numeric generated always as (round(largo_cm * ancho_cm * alto_cm / 1000000.0, 4)) stored,
  orden int default 0);
-- 1 caja = el SKU de venta; tapa = -T; base = -B; otra parte = -<inicial>
create or replace function public.sku_caja_de(p_sku text, p_parte text) returns text language sql immutable as $f$
  select case upper(p_parte) when 'COMPLETA' then p_sku when 'TAPA' then p_sku || '-T' when 'BASE' then p_sku || '-B' else p_sku || '-' || upper(left(p_parte, 1)) end $f$;
create or replace function public.cajas_nombre() returns trigger language plpgsql as $f$
begin new.parte := upper(new.parte); new.sku_caja := public.sku_caja_de(new.sku, new.parte); return new; end $f$;
drop trigger if exists trg_cajas_nombre on public.cajas;
create trigger trg_cajas_nombre before insert or update of sku, parte on public.cajas for each row execute function public.cajas_nombre();

-- ---------- stock por caja (en piezas, como lo cuenta Pailos): suma de movimientos ----------
create table if not exists public.stock_mov (
  id bigserial primary key, sku_caja text not null references public.cajas(sku_caja) on update cascade,
  piezas int not null, motivo text not null check (motivo in ('ingreso','venta','ajuste','importacion','devolucion','anulacion')),
  ref text, nota text, quien text default auth.email(), fecha timestamptz default now());
create index if not exists stock_mov_caja on public.stock_mov(sku_caja);

-- ---------- ingreso de contenedor: cajas que llegan por SKU de caja ----------
create table if not exists public.eco_ingreso (
  pedido_id bigint not null references public.eco_pedidos(id) on delete cascade,
  sku_caja text not null references public.cajas(sku_caja) on update cascade, cajas int not null check (cajas >= 0),
  primary key (pedido_id, sku_caja));
alter table public.eco_pedidos add column if not exists packing jsonb;

-- ---------- despachos (orden para Pailos) ----------
create table if not exists public.despachos (
  id bigserial primary key, order_id bigint references public.orders(id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente','programado','enviado','despachado','entregado','cancelado')),
  fecha_entrega date, nota text, created_at timestamptz default now(), unique (order_id));
create table if not exists public.despacho_items (
  id bigserial primary key, despacho_id bigint not null references public.despachos(id) on delete cascade,
  sku text, sku_caja text not null, piezas int not null, descripcion text, parte text);
alter table public.order_items add column if not exists sku text;

-- datos de la empresa para los papeles (packing list, órdenes): sólo admins
create table if not exists public.empresa_datos (id int primary key default 1, importador text, contacto text);

-- ---------- seguridad ----------
alter table public.colores enable row level security;
alter table public.colores_proveedor enable row level security;
alter table public.variantes enable row level security;
alter table public.cajas enable row level security;
alter table public.stock_mov enable row level security;
alter table public.eco_ingreso enable row level security;
alter table public.despachos enable row level security;
alter table public.despacho_items enable row level security;
alter table public.empresa_datos enable row level security;
do $f$ declare t text; begin
  foreach t in array array['colores','colores_proveedor','variantes','cajas','eco_ingreso','despachos','despacho_items','empresa_datos'] loop
    execute format('drop policy if exists "admins %1$s" on public.%1$s; create policy "admins %1$s" on public.%1$s for all using (is_admin()) with check (is_admin());', t);
  end loop;
end $f$;
-- el stock sólo se mueve agregando movimientos: no se editan ni se borran
drop policy if exists "admins stock_mov leer" on public.stock_mov; create policy "admins stock_mov leer" on public.stock_mov for select using (is_admin());
drop policy if exists "admins stock_mov alta" on public.stock_mov; create policy "admins stock_mov alta" on public.stock_mov for insert with check (is_admin());

-- ---------- cálculos ----------
-- stock por caja: físico (movimientos) + en camino (ingresos de contenedores confirmados o en tránsito)
create or replace function public.stock_cajas() returns table(sku_caja text, sku text, parte text, piezas_caja int, fisico int, en_camino int, total int)
language sql stable security definer set search_path = public as $f$
  select c.sku_caja, c.sku, c.parte, c.piezas,
    coalesce((select sum(m.piezas) from stock_mov m where m.sku_caja = c.sku_caja), 0)::int,
    coalesce((select sum(i.cajas * c.piezas) from eco_ingreso i join eco_pedidos p on p.id = i.pedido_id where i.sku_caja = c.sku_caja and p.estado in ('confirmado','en_transito')), 0)::int,
    (coalesce((select sum(m.piezas) from stock_mov m where m.sku_caja = c.sku_caja), 0) + coalesce((select sum(i.cajas * c.piezas) from eco_ingreso i join eco_pedidos p on p.id = i.pedido_id where i.sku_caja = c.sku_caja and p.estado in ('confirmado','en_transito')), 0))::int
  from cajas c $f$;
-- disponible de una variante = el mínimo entre sus cajas, menos lo reservado por pedidos sin pagar.
-- con_datos = false cuando todavía no hay stock ni contenedor confirmado: la tienda sigue usando el cupo del producto.
create or replace function public.stock_variantes() returns table(sku text, disponible int, con_datos boolean, cajas int)
language sql stable security definer set search_path = public as $f$
  with s as (select * from stock_cajas()),
  h as (select coalesce((select horas from cobro_transf where id = 1), 48) hs),
  res as (select oi.sku, sum(oi.cantidad)::int u from order_items oi join orders o on o.id = oi.order_id cross join h
          where o.estado = 'pendiente' and o.created_at > now() - make_interval(hours => h.hs) and oi.sku is not null group by 1)
  select v.sku, (case when count(s.sku_caja) = 0 then 0 else min(s.total) end - coalesce(max(res.u), 0))::int,
    coalesce(bool_or(s.fisico <> 0 or s.en_camino <> 0), false), count(s.sku_caja)::int
  from variantes v left join s on s.sku = v.sku left join res on res.sku = v.sku group by v.sku $f$;
revoke execute on function public.stock_cajas() from public, anon, authenticated;
revoke execute on function public.stock_variantes() from public, anon, authenticated;
create or replace function public.stock_cajas_admin() returns table(sku_caja text, sku text, parte text, piezas_caja int, fisico int, en_camino int, total int)
language sql stable security definer set search_path = public as $f$ select * from stock_cajas() where public.is_admin() $f$;
create or replace function public.stock_variantes_admin() returns table(sku text, disponible int, con_datos boolean, cajas int)
language sql stable security definer set search_path = public as $f$ select * from stock_variantes() where public.is_admin() $f$;
grant execute on function public.stock_cajas_admin(), public.stock_variantes_admin() to authenticated;

-- la tienda: variantes que se venden (todas menos las discontinuadas), con el nombre del color y el stock
create or replace function public.variantes_publicas() returns table(sku text, producto text, color text, nombre text, hex text, disponible int, con_datos boolean, orden int)
language sql stable security definer set search_path = public as $f$
  select v.sku, v.codigo_master, v.color, c.nombre, c.hex, greatest(0, s.disponible), coalesce(s.con_datos, false), v.orden
  from variantes v join colores c on c.codigo = v.color left join stock_variantes() s on s.sku = v.sku
  where v.estado <> 'discontinuado' and c.activo order by v.codigo_master, v.orden, v.sku $f$;
grant execute on function public.variantes_publicas() to anon, authenticated;

-- orden de despacho: lo que se vende (SKU de venta) se traduce a las cajas que saca Pailos, y se descuenta del stock
create or replace function public.despacho_lineas(p_sku text, p_cant int) returns table(sku text, sku_caja text, parte text, piezas int, descripcion text)
language sql stable security definer set search_path = public as $f$
  select v.sku, c.sku_caja, c.parte, p_cant, v.descripcion from variantes v join cajas c on c.sku = v.sku where v.sku = p_sku order by c.orden, c.sku_caja $f$;
grant execute on function public.despacho_lineas(text, int) to authenticated;
create or replace function public.generar_despacho(p_order bigint) returns bigint
language plpgsql security definer set search_path = public as $f$
declare d bigint;
begin
  select id into d from despachos where order_id = p_order; if d is not null then return d; end if;
  if not exists (select 1 from order_items where order_id = p_order and sku is not null) then return null; end if;
  insert into despachos(order_id) values (p_order) returning id into d;
  insert into despacho_items(despacho_id, sku, sku_caja, piezas, descripcion, parte)
    select d, l.sku, l.sku_caja, l.piezas, l.descripcion, l.parte from order_items oi cross join lateral despacho_lineas(oi.sku, oi.cantidad) l where oi.order_id = p_order and oi.sku is not null;
  insert into stock_mov(sku_caja, piezas, motivo, ref) select sku_caja, -piezas, 'venta', 'pedido:' || p_order from despacho_items where despacho_id = d;
  return d;
end $f$;
revoke execute on function public.generar_despacho(bigint) from public, anon, authenticated;
create or replace function public.generar_despacho_admin(p_order bigint) returns bigint language sql security definer set search_path = public as $f$ select case when public.is_admin() then generar_despacho(p_order) end $f$;
grant execute on function public.generar_despacho_admin(bigint) to authenticated;
