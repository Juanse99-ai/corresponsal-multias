-- Los movimientos pasan de (consignacion|retiro|nequi|bancolombia)
-- a destinos de consignacion: consignacion_nequi | consignacion_bancolombia | retiro
alter table public.corr_movimientos drop constraint if exists corr_movimientos_tipo_check;

update public.corr_movimientos set tipo = 'consignacion_nequi'       where tipo = 'nequi';
update public.corr_movimientos set tipo = 'consignacion_bancolombia' where tipo in ('bancolombia', 'consignacion');

alter table public.corr_movimientos
  add constraint corr_movimientos_tipo_check
  check (tipo = any (array['consignacion_nequi'::text, 'consignacion_bancolombia'::text, 'retiro'::text]));
