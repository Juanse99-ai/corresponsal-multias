-- 20260617233645 · Recaudos: convenio que el cliente paga en efectivo.
-- Rollback: 20260617233645_corr_recaudos.down.sql
alter table public.corr_movimientos drop constraint if exists corr_movimientos_tipo_check;
alter table public.corr_movimientos
  add constraint corr_movimientos_tipo_check
  check (tipo = any (array['consignacion_nequi'::text, 'consignacion_bancolombia'::text, 'retiro'::text, 'recaudo'::text]));
alter table public.corr_movimientos add column if not exists convenio text;

-- Campo de recaudos en el cuadre (electronico, igual que nequis/bancolombia).
alter table public.corr_cuadres add column if not exists recaudos bigint not null default 0;
