-- Costos (sólo admins), parámetros, precio profesional automático y contenedor compartido.
create table if not exists public.product_costs (
  product_id text primary key,
  proveedor text, fob_usd numeric, cbm numeric, moq integer,
  costo_usd numeric,          -- costo final puesto en Argentina, por unidad, sin IVA (planilla Economía)
  markup numeric,             -- si es null usa el general (settings.markup_pro)
  updated_at timestamptz default now()
);
alter table public.product_costs enable row level security;
drop policy if exists "admins costos" on public.product_costs;
create policy "admins costos" on public.product_costs for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.product_costs to authenticated;

create table if not exists public.settings (key text primary key, value numeric not null, nota text);
alter table public.settings enable row level security;
drop policy if exists "admins settings" on public.settings;
create policy "admins settings" on public.settings for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.settings to authenticated;
insert into public.settings(key,value,nota) values
 ('tc',1540,'Tipo de cambio ARS/USD'),
 ('markup_pro',0.40,'Margen general profesionales sobre costo'),
 ('iva',0.21,'IVA'),
 ('cap_cbm',71,'Capacidad del contenedor (40HQ)')
on conflict (key) do nothing;

create table if not exists public.pedidos_pro (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  email text not null, nombre text, estudio text,
  items jsonb not null, cbm numeric not null default 0, total integer not null default 0,
  estado text not null default 'reservado',  -- reservado, confirmado, cancelado
  nota text
);
alter table public.pedidos_pro enable row level security;
drop policy if exists "pro reserva" on public.pedidos_pro;
create policy "pro reserva" on public.pedidos_pro for insert to authenticated with check (public.is_pro() and estado='reservado' and lower(email)=lower(auth.jwt()->>'email'));
drop policy if exists "pro ve sus pedidos" on public.pedidos_pro;
create policy "pro ve sus pedidos" on public.pedidos_pro for select to authenticated using (lower(email)=lower(auth.jwt()->>'email'));
drop policy if exists "admins pedidos pro" on public.pedidos_pro;
create policy "admins pedidos pro" on public.pedidos_pro for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.pedidos_pro to authenticated;

-- Catálogo profesional: precio final ARS con IVA. Sólo devuelve filas a profesionales aprobados o admins.
create or replace function public.pro_catalog()
returns table(product_id text, precio integer, moq integer, cbm numeric)
language sql stable security definer set search_path = public as $$
  with s as (select
    max(value) filter (where key='tc') tc, max(value) filter (where key='markup_pro') mk, max(value) filter (where key='iva') iva from settings)
  select p.id,
    coalesce(b.precio, case when c.costo_usd is not null then (ceil(c.costo_usd*(1+coalesce(c.markup,s.mk))*(1+s.iva)*s.tc/1000)*1000)::int end),
    c.moq, c.cbm
  from products p cross join s
  left join product_costs c on c.product_id=p.id
  left join product_b2b b on b.product_id=p.id
  where p.activo and (public.is_pro() or public.is_admin());
$$;
grant execute on function public.pro_catalog() to authenticated;

-- Llenado del contenedor compartido (sólo números agregados).
create or replace function public.contenedor_estado()
returns table(cap numeric, usado numeric)
language sql stable security definer set search_path = public as $$
  select (select value from settings where key='cap_cbm'),
    coalesce((select sum(oi.cantidad*c.cbm) from order_items oi join orders o on o.id=oi.order_id join product_costs c on c.product_id=oi.product_id where o.estado in ('pagado','en_camino','entregado')),0)
  + coalesce((select sum(cbm) from pedidos_pro where estado in ('reservado','confirmado')),0)
  where public.is_pro() or public.is_admin();
$$;
grant execute on function public.contenedor_estado() to authenticated;

insert into public.product_costs(product_id,proveedor,fob_usd,cbm,moq,costo_usd) values
('SIL-MAD-187-BAI','PROV-CHN-BAI',230,0.450,8,352.97),('SIL-MAD-233-BAI','PROV-CHN-BAI',240,0.660,8,391.14),
('SIL-MAD-213-BAI','PROV-CHN-BAI',74,0.370,30,140.55),('SIL-MAD-235-BAI','PROV-CHN-BAI',200,0.630,8,335.53),
('MES-MAD-174-BAI','PROV-CHN-BAI',320,0.620,10,490.36),('MES-MAD-193-BAI','PROV-CHN-BAI',139,0.440,10,233.45),
('MES-MAD-247-BAI','PROV-CHN-BAI',99,0.150,10,146.69),('MES-MAD-249-BAI','PROV-CHN-BAI',96,0.130,10,140.40),
('MES-MAD-208-BAI','PROV-CHN-BAI',187,0.290,10,277.89),('MES-MET-112-RUD','PROV-CHN-RUD',25.70,0.160,10,52.59),
('MES-MET-113-RUD','PROV-CHN-RUD',41.80,0.210,10,79.51),('SIL-MET-008-RUD','PROV-CHN-RUD',15.20,0.083,20,29.65),
('SIL-MET-056-RUD','PROV-CHN-RUD',15.30,0.095,50,31.28),('MES-MET-166-RUD','PROV-CHN-RUD',50.60,0.130,10,81.37),
('MES-MET-163-RUD','PROV-CHN-RUD',84.80,0.300,10,146.21),('SIL-MAD-085-RUD','PROV-CHN-RUD',26.70,0.070,10,43.10),
('SIL-MET-047-RUD','PROV-CHN-RUD',59.90,0.160,10,97.05),('SIL-MET-294-RUD','PROV-CHN-RUD',30.50,0.130,50,55.17)
on conflict (product_id) do update set proveedor=excluded.proveedor,fob_usd=excluded.fob_usd,cbm=excluded.cbm,moq=excluded.moq,costo_usd=excluded.costo_usd,updated_at=now();
