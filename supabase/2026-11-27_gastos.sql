-- Gastos reales del negocio: fijos (se repiten cada mes) y puntuales (una vez). Los usa Inicio para la ganancia real.
create table if not exists public.gastos (
  id bigserial primary key,
  tipo text not null check (tipo in ('fijo','unico')),
  categoria text not null,
  descripcion text,
  monto numeric not null check (monto >= 0),
  desde date, hasta date,          -- fijo: desde qué mes y hasta cuándo (vacío = sigue)
  fecha date,                      -- puntual: cuándo
  pedido_id bigint,                -- opcional: gasto de un contenedor
  nota text, created_at timestamptz default now());
alter table public.gastos enable row level security;
drop policy if exists gastos_admin on public.gastos;
create policy gastos_admin on public.gastos for all using (public.is_admin()) with check (public.is_admin());
-- tarifas del depósito (Pailos): por m³ guardado por mes, fijo por mes y por caja que entra o sale
insert into public.settings(key, value) values ('pailos_m3_mes', 0), ('pailos_fijo_mes', 0), ('pailos_mov_caja', 0) on conflict (key) do nothing;
