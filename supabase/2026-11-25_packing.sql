-- Packing en el Maestro: piezas por caja, cajas por unidad, unidad de precio y medidas de cada caja.
-- FOB y cbm siguen siendo POR PIEZA (la Economía no cambia).
alter table public.master_productos
  add column if not exists unidad_precio text default 'PIEZA',
  add column if not exists piezas_por_caja int,
  add column if not exists cajas_por_unidad int,
  add column if not exists cajas_pack jsonb;  -- [{parte, largo_cm, ancho_cm, alto_cm, peso_bruto_kg}]
do $$ begin
  alter table public.master_productos add constraint master_unidad_precio_ck check (unidad_precio in ('PIEZA','CAJA'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.master_productos add constraint master_packing_ck check (
    coalesce(piezas_por_caja,1) > 0 and coalesce(cajas_por_unidad,1) > 0
    and not (coalesce(piezas_por_caja,1) > 1 and coalesce(cajas_por_unidad,1) > 1));
exception when duplicate_object then null; end $$;

-- historial: de dónde vino el cambio (ej. "OC CONCEPT 01")
alter table public.master_historial add column if not exists origen text;
create or replace function public.master_log() returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare k text; o jsonb; n jsonb; org text := nullif(current_setting('app.origen', true), '');
begin
  if tg_op = 'INSERT' then insert into master_historial(codigo,campo,antes,despues,quien,origen) values (new.codigo,'alta',null,new.descripcion,auth.email(),org); return new; end if;
  o := to_jsonb(old); n := to_jsonb(new);
  for k in select jsonb_object_keys(n) loop
    if k not in ('updated_at','import_token') and (o->k) is distinct from (n->k) then
      insert into master_historial(codigo,campo,antes,despues,quien,origen) values (new.codigo,k,o->>k,n->>k,auth.email(),org);
    end if;
  end loop;
  return new;
end $function$;

-- actualizar el packing de un producto con lo que trae la orden de compra (queda en el historial con el nombre de la orden)
create or replace function public.master_packing_desde_orden(p_codigo text, p_origen text, p_piezas int, p_cajas int, p_pack jsonb, p_cbm numeric)
returns void language plpgsql security definer set search_path = public as $f$
begin
  if not public.is_admin() then raise exception 'solo admin'; end if;
  perform set_config('app.origen', p_origen, true);
  update master_productos set piezas_por_caja = p_piezas, cajas_por_unidad = p_cajas, cajas_pack = p_pack,
    cbm = coalesce(p_cbm, cbm) where codigo = p_codigo;
end $f$;
revoke execute on function public.master_packing_desde_orden(text,text,int,int,jsonb,numeric) from public, anon;
grant execute on function public.master_packing_desde_orden(text,text,int,int,jsonb,numeric) to authenticated;

-- migración: los productos de CONCEPT 01 toman el packing de las cajas cargadas desde las órdenes finales (no se toca el cbm)
select set_config('app.origen', 'Migración packing · órdenes finales CONCEPT 01', false);
with v1 as (  -- una variante por producto (la primera), sus cajas
  select distinct on (v.codigo_master) v.codigo_master, v.sku from variantes v order by v.codigo_master, v.orden, v.sku),
k as (select v1.codigo_master, c.* from v1 join cajas c on c.sku = v1.sku)
update master_productos m set
  piezas_por_caja = x.p, cajas_por_unidad = x.c,
  cajas_pack = case when x.con_medidas then x.pack end
from (select codigo_master, max(piezas) p, count(*)::int c, bool_and(largo_cm is not null and ancho_cm is not null and alto_cm is not null) con_medidas,
        jsonb_agg(jsonb_build_object('parte', case when parte = 'COMPLETA' then 'UNICA' else parte end, 'largo_cm', largo_cm, 'ancho_cm', ancho_cm, 'alto_cm', alto_cm, 'peso_bruto_kg', peso_bruto) order by orden, sku_caja) pack
      from k group by codigo_master) x
where m.codigo = x.codigo_master and m.piezas_por_caja is null;
select set_config('app.origen', '', false);
