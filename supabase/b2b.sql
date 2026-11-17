-- =====================================================================
-- FORMA Concept B2B — canal separado del B2C (no toca products/orders)
-- Correr completo en Supabase > SQL editor. Es idempotente.
-- Regla: los COSTOS (b2b_params, b2b_products) solo los ve el admin.
-- Los clientes ven b2b_catalog (sin costos) y SOLO el precio de su tipo.
-- =====================================================================

-- ---------- parámetros (una sola fila, jsonb editable desde /b2b-panel)
create table if not exists public.b2b_params (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- productos con costos (solo admin)
create table if not exists public.b2b_products (
  codigo text primary key,              -- código Concept (SIL-MET-001-RUD)
  proveedor text,                       -- PROV-CHN-RUD
  cod_proveedor text,                   -- MC-290
  nombre text not null,
  categoria text, subcategoria text, familia text,
  material text, terminacion text, medidas text, armado text,
  moq int not null default 1,           -- por producto Y por color
  fob numeric not null default 0,       -- USD por unidad
  cbm numeric not null default 0,       -- m³ por unidad
  peso numeric,
  foto text,
  colores jsonb not null default '[]'::jsonb,
  observaciones text,
  activo boolean not null default false,   -- lo elegís para el portal
  arancel numeric,                      -- override % (null = el de la subcategoría)
  mult_prof numeric,                    -- override (null = el general)
  mult_may numeric,
  updated_at timestamptz not null default now()
);

-- ---------- catálogo publicado (sin costos)
create table if not exists public.b2b_catalog (
  codigo text primary key,
  nombre text not null,
  subcategoria text, familia text, material text, terminacion text,
  medidas text, armado text, foto text,
  moq int not null, cbm numeric not null,
  colores jsonb not null default '[]'::jsonb,
  orden int default 0,
  published_at timestamptz not null default now()
);

-- ---------- precios publicados: una fila por producto × tipo × contenedor
create table if not exists public.b2b_prices (
  codigo text references public.b2b_catalog(codigo) on delete cascade,
  tipo text check (tipo in ('profesional','mayorista')),
  contenedor text check (contenedor in ('40HQ','20')),
  precio numeric not null,              -- USD sin IVA por unidad
  primary key (codigo, tipo, contenedor)
);

-- ---------- reglas públicas para el portal (mínimos, cobro) — sin costos
create table if not exists public.b2b_rules (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- clientes B2B
create table if not exists public.b2b_clients (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  razon_social text, cuit text, contacto text, telefono text,
  tipo text not null default 'profesional' check (tipo in ('profesional','mayorista')),
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobado','rechazado')),
  notas text,
  created_at timestamptz not null default now()
);

-- ---------- contenedores (para agrupar pedidos y ver el llenado)
create table if not exists public.b2b_containers (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('40HQ','20')),
  estado text not null default 'armando' check (estado in ('armando','cerrado','en_produccion','en_transito','entregado')),
  notas text,
  created_at timestamptz not null default now()
);

-- ---------- pedidos
create table if not exists public.b2b_orders (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  client_id uuid not null references public.b2b_clients(id),
  modalidad text not null check (modalidad in ('compartido40','propio40','propio20')),
  estado text not null default 'solicitado' check (estado in ('solicitado','aprobado','anticipo1','anticipo2','en_transito','entregado','cancelado')),
  container_id uuid references public.b2b_containers(id),
  cbm_total numeric not null default 0,
  subtotal_usd numeric not null default 0,   -- sin IVA
  notas text,
  created_at timestamptz not null default now()
);
create table if not exists public.b2b_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.b2b_orders(id) on delete cascade,
  codigo text not null,
  nombre text, color text,
  cantidad int not null check (cantidad > 0),
  precio_unit numeric not null,
  cbm_unit numeric not null
);

-- ---------- helpers
create or replace function public.b2b_my_client() returns public.b2b_clients
language sql stable security definer set search_path = public as $$
  select * from public.b2b_clients where lower(email) = lower(auth.jwt()->>'email') limit 1
$$;
create or replace function public.b2b_is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.b2b_clients
    where lower(email) = lower(auth.jwt()->>'email') and estado = 'aprobado')
$$;

-- ---------- RLS
alter table public.b2b_params      enable row level security;
alter table public.b2b_products    enable row level security;
alter table public.b2b_catalog     enable row level security;
alter table public.b2b_prices      enable row level security;
alter table public.b2b_rules       enable row level security;
alter table public.b2b_clients     enable row level security;
alter table public.b2b_containers  enable row level security;
alter table public.b2b_orders      enable row level security;
alter table public.b2b_order_items enable row level security;

do $$ declare t text; begin
  foreach t in array array['b2b_params','b2b_products','b2b_catalog','b2b_prices','b2b_rules',
                           'b2b_clients','b2b_containers','b2b_orders','b2b_order_items'] loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- clientes aprobados: catálogo, reglas y SOLO los precios de su tipo
drop policy if exists cli_read on public.b2b_catalog;
create policy cli_read on public.b2b_catalog for select using (public.b2b_is_approved());
drop policy if exists cli_read on public.b2b_rules;
create policy cli_read on public.b2b_rules for select using (public.b2b_is_approved());
drop policy if exists cli_read on public.b2b_prices;
create policy cli_read on public.b2b_prices for select
  using (public.b2b_is_approved() and tipo = (public.b2b_my_client()).tipo);

-- el cliente ve y da de alta su propia ficha (siempre entra 'pendiente')
drop policy if exists cli_self on public.b2b_clients;
create policy cli_self on public.b2b_clients for select using (lower(email) = lower(auth.jwt()->>'email'));
drop policy if exists cli_signup on public.b2b_clients;
create policy cli_signup on public.b2b_clients for insert
  with check (lower(email) = lower(auth.jwt()->>'email') and estado = 'pendiente');

-- pedidos: el cliente aprobado crea y ve los suyos
drop policy if exists cli_orders on public.b2b_orders;
create policy cli_orders on public.b2b_orders for select using (client_id = (public.b2b_my_client()).id);
drop policy if exists cli_orders_ins on public.b2b_orders;
create policy cli_orders_ins on public.b2b_orders for insert
  with check (public.b2b_is_approved() and client_id = (public.b2b_my_client()).id and estado = 'solicitado');
drop policy if exists cli_items on public.b2b_order_items;
create policy cli_items on public.b2b_order_items for select
  using (exists(select 1 from public.b2b_orders o where o.id = order_id and o.client_id = (public.b2b_my_client()).id));
drop policy if exists cli_items_ins on public.b2b_order_items;
create policy cli_items_ins on public.b2b_order_items for insert
  with check (exists(select 1 from public.b2b_orders o where o.id = order_id
    and o.client_id = (public.b2b_my_client()).id and o.estado = 'solicitado'));

-- ---------- parámetros iniciales (fletes 16/11, validez 21/11; Economía PARAMETROS)
insert into public.b2b_params (id, data) values (1, '{
  "tc": 1540,
  "cont": {
    "40HQ": {"flete": 3650, "locales": 815, "util": 73},
    "20":   {"flete": 3450, "locales": 785, "util": 28}
  },
  "flete_validez": "2026-11-21",
  "seguro_pct": 2, "honorarios_pct": 1.5, "imprevistos_pct": 2, "otros_pct": 0,
  "fijos": {"sim": 400, "terminal": 500, "transporte": 600, "verificacion": 1000, "resguardo": 500},
  "arancel_def": 18, "tasa_def": 3,
  "subcats": {},
  "mult_prof": 1.9, "mult_may": 1.6,
  "min_cbm_compartido": 30, "acepto_completar": true, "min_fill_propio_pct": 90,
  "cobro": [30, 60, 10], "iva": 21
}'::jsonb) on conflict (id) do nothing;
