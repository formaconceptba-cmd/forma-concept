-- Contenedor: la orden de compra manda. FOB y m³ por pieza propios de cada contenedor + proformas/órdenes guardadas.
alter table public.eco_items add column if not exists fob_oc numeric;   -- FOB US$ por pieza según la orden (vacío = el del Maestro)
alter table public.eco_items add column if not exists cbm_oc numeric;   -- m³ por pieza según la orden (vacío = el del Maestro)

create table if not exists public.eco_docs (
  id bigint generated always as identity primary key,
  pedido_id bigint references public.eco_pedidos(id) on delete set null,
  proveedor text,
  tipo text not null default 'orden' check (tipo in ('orden','proforma','otro')),
  nombre text not null,
  path text not null,
  created_at timestamptz default now()
);
alter table public.eco_docs enable row level security;
drop policy if exists eco_docs_admin on public.eco_docs;
create policy eco_docs_admin on public.eco_docs for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.eco_docs from anon;

-- archivos: carpeta privada, sólo el panel
insert into storage.buckets(id, name, public) values ('compras', 'compras', false) on conflict (id) do nothing;
drop policy if exists compras_admin_sel on storage.objects;
drop policy if exists compras_admin_ins on storage.objects;
drop policy if exists compras_admin_del on storage.objects;
create policy compras_admin_sel on storage.objects for select to authenticated using (bucket_id = 'compras' and public.is_admin());
create policy compras_admin_ins on storage.objects for insert to authenticated with check (bucket_id = 'compras' and public.is_admin());
create policy compras_admin_del on storage.objects for delete to authenticated using (bucket_id = 'compras' and public.is_admin());
