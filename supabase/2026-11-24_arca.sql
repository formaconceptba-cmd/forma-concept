-- Factura electrónica ARCA (WSAA + WSFE): cola con reintentos, notas de crédito por devolución, PDF privado y token cacheado.

-- ---------- facturas: más de una nota de crédito por pedido (una por devolución), estado "procesando" y datos del comprobante ----------
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.facturas'::regclass and contype = 'u' loop
    execute format('alter table public.facturas drop constraint %I', c); end loop;
  for c in select conname from pg_constraint where conrelid = 'public.facturas'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%estado%' loop
    execute format('alter table public.facturas drop constraint %I', c); end loop;
end $$;
alter table public.facturas add constraint facturas_estado_check check (estado in ('pendiente','procesando','emitida','error','manual','anulada'));
create unique index if not exists facturas_una_b on public.facturas(order_id) where tipo = 'B';
alter table public.facturas add column if not exists entorno text;            -- 'homo' (prueba) o 'prod'
alter table public.facturas add column if not exists devolucion_id bigint unique references public.devoluciones(id);
alter table public.facturas add column if not exists doc_tipo int;
alter table public.facturas add column if not exists doc_nro bigint;
alter table public.facturas add column if not exists cbte_fch date;
alter table public.facturas add column if not exists neto numeric;
alter table public.facturas add column if not exists iva numeric;
alter table public.facturas add column if not exists mail_at timestamptz;
alter table public.facturas add column if not exists procesando_at timestamptz;

-- al cancelar: si la factura ya salió y todavía no hay nota de crédito (por ejemplo de una devolución), va una por el total
create or replace function public.facturas_cola() returns trigger language plpgsql security definer set search_path = public as $f$
begin
  if new.estado = 'pagado' and old.estado is distinct from 'pagado' then
    insert into facturas(order_id, tipo, total) values (new.id, 'B', new.total) on conflict do nothing;
  end if;
  if new.estado = 'cancelado' and old.estado is distinct from 'cancelado' then
    new.cancelado_at := now();
    insert into facturas(order_id, tipo, total, factura_ref)
      select new.id, 'NC-B', f.total, f.id from facturas f
       where f.order_id = new.id and f.tipo = 'B' and f.estado in ('emitida','manual','procesando')
         and not exists (select 1 from facturas n where n.order_id = new.id and n.tipo = 'NC-B' and n.estado <> 'anulada');
    -- si la factura todavía no salió, no hace falta nota de crédito: se anula en la cola (y las notas que esperaban por ella)
    update facturas set estado = 'anulada' where order_id = new.id and tipo = 'B' and estado in ('pendiente','error');
    update facturas set estado = 'anulada' where order_id = new.id and tipo = 'NC-B' and estado in ('pendiente','error')
       and factura_ref in (select id from facturas where order_id = new.id and tipo = 'B' and estado = 'anulada');
  end if;
  if new.estado = 'en_camino' and old.estado is distinct from 'en_camino' then new.despachado_at := coalesce(new.despachado_at, now()); end if;
  return new;
end $f$;

-- devolución registrada sobre un pedido facturado (o con la factura en cola): nota de crédito por el monto devuelto
create or replace function public.devolucion_nc() returns trigger language plpgsql security definer set search_path = public as $f$
declare b facturas;
begin
  select * into b from facturas where order_id = new.order_id and tipo = 'B' and estado <> 'anulada';
  if b.id is not null then
    insert into facturas(order_id, tipo, total, factura_ref, devolucion_id)
      values (new.order_id, 'NC-B', least(new.monto, b.total), b.id, new.id) on conflict do nothing;
  end if;
  return new;
end $f$;
drop trigger if exists devolucion_nc on public.devoluciones;
create trigger devolucion_nc after insert on public.devoluciones for each row execute function public.devolucion_nc();

-- ---------- token de ARCA (dura 12 h; ARCA no da otro mientras el anterior siga vigente). Sólo lo lee el servidor ----------
create table if not exists public.arca_ta (entorno text primary key, token text not null, sign text not null, expira timestamptz not null, updated_at timestamptz default now());
alter table public.arca_ta enable row level security;
revoke all on public.arca_ta from anon, authenticated;

-- ---------- PDFs de facturas: carpeta privada, sólo el panel (admin) los ve ----------
insert into storage.buckets(id, name, public) values ('facturas', 'facturas', false) on conflict (id) do nothing;
drop policy if exists facturas_pdf_admin on storage.objects;
create policy facturas_pdf_admin on storage.objects for select to authenticated using (bucket_id = 'facturas' and public.is_admin());

-- ---------- datos fijos de la factura (los completa Franco en el panel) ----------
insert into public.config_tienda(key, value) values
 ('fact_razon', 'DEL GRUPPO S.R.L.'), ('fact_domicilio', ''), ('fact_iibb', ''), ('fact_inicio', ''), ('fact_activa', '1')
on conflict (key) do nothing;

-- ---------- plantilla de mail con la factura adjunta ----------
insert into public.mail_plantillas(clave, nombre, asunto, cuerpo, orden) values
('factura','Factura (adjunta)','Tu factura · Pedido #{pedido}',
 E'Tu factura\n\n{nombre}, te adjuntamos el comprobante de tu pedido #{pedido}: {comprobante}.\n\nGuardalo: te sirve como comprobante de compra y para la garantía.', 6)
on conflict (clave) do nothing;
