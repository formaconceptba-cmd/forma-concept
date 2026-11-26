-- Promociones: por tiempo limitado (automáticas, con cuenta regresiva opcional) y códigos de descuento (influencers, clientes).
create table if not exists public.promociones (
  id bigserial primary key,
  nombre text not null,
  tipo text not null check (tipo in ('fecha','codigo')),
  codigo text,
  pct numeric not null check (pct > 0 and pct <= 0.9),
  alcance text not null default 'todo' check (alcance in ('todo','categoria','producto')),
  alcance_valor text[] not null default '{}',
  desde timestamptz, hasta timestamptz,
  activo boolean not null default true,
  cuenta_regresiva boolean not null default false,
  banner text,
  usos_max int, usos int not null default 0,
  nota text, created_at timestamptz default now());
create unique index if not exists promociones_codigo on public.promociones (upper(codigo)) where codigo is not null;
alter table public.promociones enable row level security;
drop policy if exists promo_admin on public.promociones;
create policy promo_admin on public.promociones for all using (public.is_admin()) with check (public.is_admin());

-- lo que ve la tienda: promos por tiempo que están corriendo ahora (los códigos nunca se listan)
create or replace function public.promo_vigente()
returns table(id bigint, nombre text, pct numeric, alcance text, alcance_valor text[], hasta timestamptz, cuenta_regresiva boolean, banner text)
language sql stable security definer set search_path = public as $f$
  select id, nombre, pct, alcance, alcance_valor, hasta, cuenta_regresiva, banner from promociones
  where tipo = 'fecha' and activo and (desde is null or desde <= now()) and (hasta is null or hasta > now())
  order by pct desc $f$;
grant execute on function public.promo_vigente() to anon, authenticated;

-- validar un código escrito por el cliente
create or replace function public.cupon_validar(p_codigo text)
returns table(codigo text, nombre text, pct numeric, alcance text, alcance_valor text[])
language sql stable security definer set search_path = public as $f$
  select upper(codigo), nombre, pct, alcance, alcance_valor from promociones
  where tipo = 'codigo' and activo and upper(codigo) = upper(trim(p_codigo))
    and (desde is null or desde <= now()) and (hasta is null or hasta > now())
    and (usos_max is null or usos < usos_max)
  limit 1 $f$;
grant execute on function public.cupon_validar(text) to anon, authenticated;

-- lo usa el checkout (clave secreta) para sumar un uso
create or replace function public.cupon_usar(p_codigo text) returns void
language sql security definer set search_path = public as $f$
  update promociones set usos = usos + 1 where tipo = 'codigo' and upper(codigo) = upper(trim(p_codigo)) $f$;
revoke execute on function public.cupon_usar(text) from public, anon, authenticated;

alter table public.orders add column if not exists cupon text;
alter table public.orders add column if not exists descuento numeric;
alter table public.order_items add column if not exists promo text;

-- mails de promociones: quién pidió no recibir más
create table if not exists public.mail_bajas (email text primary key, fecha timestamptz default now());
alter table public.mail_bajas enable row level security;
drop policy if exists bajas_admin on public.mail_bajas;
create policy bajas_admin on public.mail_bajas for select using (public.is_admin());
