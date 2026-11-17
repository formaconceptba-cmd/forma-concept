-- B2B: profesionales (se registran, admins aprueban) y precios profesionales (sólo los ven aprobados y admins).
create table if not exists public.profesionales (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  email text not null unique,
  nombre text not null, estudio text, cuit text, telefono text, rubro text,
  estado text not null default 'pendiente',  -- pendiente, aprobado, rechazado
  constraint pro_len check (char_length(email)<=160 and char_length(nombre)<=120 and char_length(coalesce(estudio,''))<=120 and char_length(coalesce(cuit,''))<=20 and char_length(coalesce(telefono,''))<=40 and char_length(coalesce(rubro,''))<=60)
);
alter table public.profesionales enable row level security;
drop policy if exists "registro profesional" on public.profesionales;
create policy "registro profesional" on public.profesionales for insert to anon, authenticated with check (estado = 'pendiente');
drop policy if exists "pro ve su ficha" on public.profesionales;
create policy "pro ve su ficha" on public.profesionales for select to authenticated using (lower(email) = lower(auth.jwt()->>'email'));
drop policy if exists "admins profesionales" on public.profesionales;
create policy "admins profesionales" on public.profesionales for all using (public.is_admin()) with check (public.is_admin());
grant insert on public.profesionales to anon, authenticated;
grant select, update, delete on public.profesionales to authenticated;

create or replace function public.is_pro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profesionales where estado = 'aprobado' and lower(email) = lower(coalesce(auth.jwt()->>'email','')));
$$;
grant execute on function public.is_pro() to anon, authenticated;

create table if not exists public.product_b2b (
  product_id text primary key references public.products(id) on delete cascade,
  precio integer
);
alter table public.product_b2b enable row level security;
drop policy if exists "pros ven precios" on public.product_b2b;
create policy "pros ven precios" on public.product_b2b for select to authenticated using (public.is_pro() or public.is_admin());
drop policy if exists "admins precios pro" on public.product_b2b;
create policy "admins precios pro" on public.product_b2b for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.product_b2b to authenticated;
