-- 20260825191623 · Sumas hechas en la base para bajar el consumo: antes la app
-- se traia tablas enteras y sumaba en el navegador. Son security invoker, o sea
-- que respetan lo que cada usuario puede ver.
-- (El 22 sep 2026, 20260922170126 les fija search_path y les quita anon.)
-- Rollback: 20260825191623_corr_rpc_agregados.down.sql
create or replace function public.corr_header_resumen()
returns json
language sql stable
as $$
  select json_build_object(
    'prestamos_total', coalesce(sum(greatest(d.monto - coalesce(a.abonado, 0), 0)), 0),
    'prestamos_count', count(*) filter (where d.monto - coalesce(a.abonado, 0) > 0),
    'personas', coalesce(json_agg(distinct d.persona), '[]'::json)
  )
  from public.corr_deudas d
  left join (
    select deuda_id, sum(monto) as abonado
    from public.corr_abonos
    group by deuda_id
  ) a on a.deuda_id = d.id;
$$;

create or replace function public.corr_saldo_luis(p_hasta date, p_incluir boolean)
returns bigint
language sql stable
as $$
  select coalesce((
      select sum(monto) from public.corr_compensaciones_luis
      where fecha < p_hasta or (p_incluir and fecha = p_hasta)
    ), 0)
    - coalesce((
      select sum(monto) from public.corr_consignaciones_luis
      where fecha < p_hasta or (p_incluir and fecha = p_hasta)
    ), 0);
$$;

create or replace function public.corr_luis_historial()
returns table (fecha date, consignaciones bigint, compensaciones bigint)
language sql stable
as $$
  select t.fecha, coalesce(sum(t.consig), 0), coalesce(sum(t.comp), 0)
  from (
    select fecha, monto as consig, 0 as comp from public.corr_consignaciones_luis
    union all
    select fecha, 0, monto from public.corr_compensaciones_luis
  ) t
  group by t.fecha
  order by t.fecha;
$$;

create or replace function public.corr_deudas_saldos()
returns table (persona text, monto bigint, abonado bigint)
language sql stable
as $$
  select d.persona, d.monto::bigint, coalesce(a.abonado, 0)::bigint
  from public.corr_deudas d
  left join (
    select deuda_id, sum(monto) as abonado
    from public.corr_abonos
    group by deuda_id
  ) a on a.deuda_id = d.id;
$$;
