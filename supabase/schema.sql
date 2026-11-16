-- FORMA Concept · esquema inicial
-- products: catálogo. orders + order_items: pedidos. admins: quién puede editar.

create table if not exists public.products (
  id text primary key,                 -- código interno, ej. SIL-MET-008-RUD
  img text not null,                   -- foto principal (código proveedor)
  img2 text,                           -- foto ambientada (hover)
  tipo text not null,                  -- Silla, Mesa, Butaca...
  nombre text not null,                -- VARILLA, ACANALADA 100...
  linea text not null,                 -- Acero, Fresno, Laca
  categoria text not null,             -- Sillas, Mesas, Mesas bajas...
  bajada text,                         -- frase corta
  material text,
  terminacion text,
  ancho numeric, prof numeric, alto numeric,
  redonda boolean default false,
  precio_lista integer,                -- ARS con IVA; null = sin precio todavía
  unidades integer default 0,          -- cupo de preventa
  vendidas integer default 0,
  armado boolean default false,
  colores jsonb default '[]'::jsonb,   -- [["Terracota","#C07A68"], ...]
  destacado boolean default false,
  activo boolean default true,
  orden integer default 0,
  updated_at timestamptz default now()
);

create table if not exists public.admins (
  email text primary key
);
insert into public.admins(email) values ('formaconcept.ba@gmail.com') on conflict do nothing;

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  estado text default 'pendiente',     -- pendiente, pagado, en_camino, entregado, cancelado
  nombre text, email text, telefono text,
  cp text, direccion text, envio text, costo_envio integer default 0,
  total integer not null,
  mp_preference text, mp_payment text
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint references public.orders(id) on delete cascade,
  product_id text references public.products(id),
  color text, cantidad integer not null, precio integer not null
);

-- Seguridad: todos pueden VER productos activos; solo admins editan.
alter table public.products enable row level security;
alter table public.admins enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admins where email = auth.jwt()->>'email')
$$;

drop policy if exists "ver productos" on public.products;
create policy "ver productos" on public.products for select using (activo or public.is_admin());
drop policy if exists "admins editan productos" on public.products;
create policy "admins editan productos" on public.products for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins ven pedidos" on public.orders;
create policy "admins ven pedidos" on public.orders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins ven items" on public.order_items;
create policy "admins ven items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins ven admins" on public.admins;
create policy "admins ven admins" on public.admins for select using (public.is_admin());
-- Los pedidos los crea el servidor (con Mercado Pago), no el navegador.

-- Botón de arrepentimiento (Res. 424/2020): cualquiera puede enviar, sólo admins ven.
create table if not exists public.arrepentimientos (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  codigo text, nombre text not null, email text not null, telefono text, pedido text, motivo text,
  estado text default 'nuevo',
  constraint arr_len check (char_length(coalesce(nombre,''))<=120 and char_length(coalesce(email,''))<=160 and char_length(coalesce(telefono,''))<=40 and char_length(coalesce(pedido,''))<=40 and char_length(coalesce(motivo,''))<=600 and char_length(coalesce(codigo,''))<=20)
);
alter table public.arrepentimientos enable row level security;
drop policy if exists "cualquiera envia arrepentimiento" on public.arrepentimientos;
create policy "cualquiera envia arrepentimiento" on public.arrepentimientos for insert to anon, authenticated with check (estado = 'nuevo');
drop policy if exists "admins ven arrepentimientos" on public.arrepentimientos;
create policy "admins ven arrepentimientos" on public.arrepentimientos for all using (public.is_admin()) with check (public.is_admin());
grant insert on public.arrepentimientos to anon, authenticated;
