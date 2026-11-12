-- Rollback de 20260617175020. Devuelve los tipos viejos. OJO: 'consignacion_bancolombia'
-- vuelve como 'bancolombia', asi que se pierde cuales eran 'consignacion' a secas.
alter table public.corr_movimientos drop constraint if exists corr_movimientos_tipo_check;
update public.corr_movimientos set tipo = 'nequi'       where tipo = 'consignacion_nequi';
update public.corr_movimientos set tipo = 'bancolombia' where tipo = 'consignacion_bancolombia';
alter table public.corr_movimientos
  add constraint corr_movimientos_tipo_check
  check (tipo = any (array['consignacion'::text, 'retiro'::text, 'nequi'::text, 'bancolombia'::text]));
